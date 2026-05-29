"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, createSession, getCurrentUser, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifySubscribers } from "@/lib/newsletter";
import { slugify } from "@/lib/slug";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function loginAction(_: unknown, formData: FormData) {
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");
  const next = stringValue(formData, "next") || "/";

  const db = getDb();
  let user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user && email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    user = await db.user.create({
      data: {
        name: "Nathalie Garcia",
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
      },
    });
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, message: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function registerAction(_: unknown, formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  const next = stringValue(formData, "next") || "/";

  if (!name || !email || password.length < 8) {
    return { ok: false, message: "Escribe tu nombre, correo y una contraseña de al menos 8 caracteres." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Escribe un correo válido." };
  }

  try {
    const user = await getDb().user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "USER",
      },
    });

    await createSession(user.id);
  } catch {
    return { ok: false, message: "Ese correo ya está registrado o no pudimos crear tu cuenta." };
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function subscribeAction(_: unknown, formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const interest = stringValue(formData, "interest");
  const consent = formData.get("consent") === "on";

  if (!name || !email || !interest) {
    return { ok: false, message: "Completa nombre, correo e interés principal." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Escribe un correo válido." };
  }

  if (!consent) {
    return { ok: false, message: "Necesitamos tu consentimiento para enviarte OFF." };
  }

  try {
    await getDb().subscriber.upsert({
      where: { email },
      update: { name, interest, consent },
      create: { name, email, interest, consent },
    });
  } catch {
    return { ok: false, message: "No pudimos guardar tu suscripción. Intenta de nuevo." };
  }

  revalidatePath("/");
  return { ok: true, message: "Ya estás dentro de OFF. Te llegará el próximo capítulo." };
}

async function saveCoverImage(formData: FormData, fallback: string) {
  const file = formData.get("coverFile");
  if (!(file instanceof File) || file.size === 0) return fallback;

  const extension = path.extname(file.name) || ".png";
  const safeName = `${Date.now()}-${slugify(file.name.replace(extension, ""))}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), bytes);
  return `/uploads/${safeName}`;
}

async function saveUploadedFile(file: File) {
  const extension = path.extname(file.name) || ".png";
  const safeName = `${Date.now()}-${slugify(file.name.replace(extension, ""))}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), bytes);
  return `/uploads/${safeName}`;
}

async function resolveInlineImages(content: string, formData: FormData) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }

  if (!Array.isArray(parsed)) return content;

  const resolved = [];

  for (const block of parsed) {
    if (
      block &&
      typeof block === "object" &&
      "type" in block &&
      block.type === "image" &&
      "src" in block &&
      typeof block.src === "string" &&
      block.src.startsWith("__UPLOAD__:")
    ) {
      const inputName = block.src.replace("__UPLOAD__:", "");
      const file = formData.get(inputName);
      if (file instanceof File && file.size > 0) {
        resolved.push({ ...block, src: await saveUploadedFile(file) });
        continue;
      }
    }

    resolved.push(block);
  }

  return JSON.stringify(resolved);
}

export type SaveArticleState = {
  ok: boolean;
  message: string;
  articleId?: string;
  slug?: string;
  status?: string;
};

export async function saveArticleAction(_: SaveArticleState, formData: FormData): Promise<SaveArticleState> {
  try {
    await requireAdmin();

    const id = stringValue(formData, "id");
    const title = stringValue(formData, "title");
    const excerpt = stringValue(formData, "excerpt");
    const category = stringValue(formData, "category");
    const readTime = stringValue(formData, "readTime");
    let content = stringValue(formData, "content");
    const selectedStatus = stringValue(formData, "status") || "draft";
    const intent = stringValue(formData, "publishIntent");
    const status = intent === "publish" ? "published" : intent === "draft" ? "draft" : selectedStatus;
    const featured = formData.get("featured") === "on";
    const slug = stringValue(formData, "slug") || slugify(title);
    const currentCover = stringValue(formData, "coverImage");
    const coverImage = await saveCoverImage(formData, currentCover);

    if (!title) return { ok: false, message: "Falta titulo." };
    if (!slug) return { ok: false, message: "Falta slug." };
    if (!excerpt) return { ok: false, message: "Falta subtitulo o extracto." };
    if (!content) return { ok: false, message: "Falta contenido." };
    if (!category) return { ok: false, message: "Falta categoria." };
    if (!readTime) return { ok: false, message: "Falta tiempo estimado de lectura." };

    content = await resolveInlineImages(content, formData);

    if (content.length > 900000) {
      return { ok: false, message: "El artículo es demasiado pesado. Revisa imágenes insertadas." };
    }

    if (/data:image\/[a-zA-Z]+;base64,/.test(content)) {
      return { ok: false, message: "El artículo contiene imágenes en base64. Sube las imágenes correctamente antes de publicar." };
    }

    try {
      const parsedContent = JSON.parse(content) as Array<Record<string, unknown>>;
      const hasReadableContent = Array.isArray(parsedContent) && parsedContent.some((block) => {
        if (typeof block.text === "string" && block.text.trim()) return true;
        if (typeof block.src === "string" && block.src.trim()) return true;
        if (Array.isArray(block.items) && block.items.length > 0) return true;
        if (typeof block.url === "string" && block.url.trim()) return true;
        if (typeof block.value === "string" && block.value.trim()) return true;
        if (typeof block.left === "string" && block.left.trim()) return true;
        if (Array.isArray(block.images) && block.images.length > 0) return true;
        return false;
      });
      if (!hasReadableContent) return { ok: false, message: "Falta contenido." };
    } catch {
      if (!content.trim()) return { ok: false, message: "Falta contenido." };
    }

    if (content.length > 70000) {
      return { ok: false, message: "El contenido supera el límite de 70,000 caracteres." };
    }

    if (!coverImage) return { ok: false, message: "Falta portada." };

    const db = getDb();
    const articleWithSlug = await db.article.findUnique({ where: { slug } });
    if (articleWithSlug && articleWithSlug.id !== id) {
      return { ok: false, message: "Ese slug ya existe. Cambia el slug antes de publicar." };
    }

    const existingArticle = id ? await db.article.findUnique({ where: { id } }) : null;
    if (id && !existingArticle) {
      return { ok: false, message: "No encontramos este artículo para actualizarlo." };
    }

    const publishedAt = status === "published" ? existingArticle?.publishedAt ?? new Date() : existingArticle?.publishedAt ?? null;
    const data = {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      readTime,
      author: "Nathalie Garcia",
      status,
      featured,
      publishedAt,
    };

    if (featured) {
      await db.article.updateMany({
        where: id ? { NOT: { id } } : undefined,
        data: { featured: false },
      });
    }

    const article = id
      ? await db.article.update({ where: { id }, data })
      : await db.article.create({ data });

    if (status === "published") {
      const subscribers = await db.subscriber.findMany({ where: { consent: true } });
      try {
        await notifySubscribers(article, subscribers);
      } catch (error) {
        console.error("No pudimos enviar el newsletter de OFF.", error);
      }
    }

    revalidatePath("/");
    revalidatePath(`/off/${article.slug}`);
    revalidatePath("/admin");

    return {
      ok: true,
      message: status === "published" ? "Artículo publicado correctamente" : "Borrador guardado correctamente",
      articleId: article.id,
      slug: article.slug,
      status: article.status,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No pudimos guardar el artículo. Intenta de nuevo.",
    };
  }
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  if (!id) {
    redirect("/admin?deleted=error");
  }

  const db = getDb();
  const article = await db.article.findUnique({ where: { id } });
  if (!article) {
    redirect("/admin?deleted=missing");
  }

  await db.article.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/off/${article.slug}`);
  redirect("/admin?deleted=1");
}

export async function commentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(stringValue(formData, "articlePath") || "/")}`);
  }

  const articleId = stringValue(formData, "articleId");
  const articleSlug = stringValue(formData, "articleSlug");
  const content = stringValue(formData, "content");

  if (!articleId || !articleSlug || content.length < 2) {
    return;
  }

  await getDb().comment.create({
    data: {
      articleId,
      userId: user.id,
      content,
      status: "PUBLISHED",
    },
  });

  revalidatePath(`/off/${articleSlug}`);
}
