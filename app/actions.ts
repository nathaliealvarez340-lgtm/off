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

export async function saveArticleAction(formData: FormData) {
  await requireAdmin();

  const id = stringValue(formData, "id");
  const title = stringValue(formData, "title");
  const excerpt = stringValue(formData, "excerpt");
  const category = stringValue(formData, "category");
  const readTime = stringValue(formData, "readTime");
  const content = stringValue(formData, "content");
  const status = stringValue(formData, "status") || "draft";
  const featured = formData.get("featured") === "on";
  const slug = stringValue(formData, "slug") || slugify(title);
  const currentCover = stringValue(formData, "coverImage") || "/covers/off-chapter-1.svg";
  const coverImage = await saveCoverImage(formData, currentCover);

  if (!title || !slug || !excerpt || !content || !category || !readTime) {
    throw new Error("Faltan campos obligatorios para guardar el artículo.");
  }

  const db = getDb();
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
    publishedAt: status === "published" ? new Date() : null,
  };

  if (featured) {
    await db.article.updateMany({ data: { featured: false } });
  }

  const article = id
    ? await db.article.update({ where: { id }, data })
    : await db.article.create({ data });

  if (status === "published") {
    const subscribers = await db.subscriber.findMany({ where: { consent: true } });
    await notifySubscribers(article, subscribers);
  }

  revalidatePath("/");
  revalidatePath(`/off/${article.slug}`);
  revalidatePath("/admin");
  redirect("/admin");
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
