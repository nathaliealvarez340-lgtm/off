"use server";

import { mkdir, writeFile } from "fs/promises";
import { randomInt } from "crypto";
import path from "path";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, createSession, getCurrentUser, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifySubscribers, sendRegistrationCode } from "@/lib/newsletter";
import { startOffOnboardingSafely } from "@/lib/off-onboarding";
import { isInternalContentCategory } from "@/lib/articles";
import { deriveLoungeContentFromArticle } from "@/lib/lounge-automation";
import { slugify } from "@/lib/slug";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nathaliegarcia@maiabusiness.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "OFFbyMA1A";

export async function loginAction(_: unknown, formData: FormData) {
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");
  const next = stringValue(formData, "next") || "/";

  const db = getDb();
  let user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user && email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
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

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/lounge";
  redirect(safeNext === "/" ? "/lounge" : safeNext);
}

export type RegistrationState = {
  ok: boolean;
  message: string;
  step?: "register" | "verify" | "login";
  email?: string;
};

function validateRegistration(formData: FormData):
  | { ok: false; error: string }
  | { ok: true; name: string; email: string; password: string } {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  const repeatPassword = stringValue(formData, "repeatPassword");

  if (name.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Escribe un correo válido." };
  if (password.length < 6 || password.length > 8) return { ok: false, error: "La contraseña debe tener entre 6 y 8 caracteres." };
  if (password !== repeatPassword) return { ok: false, error: "Las contraseñas no coinciden." };

  return { ok: true, name, email, password };
}

export async function registerAction(_: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const values = validateRegistration(formData);
  if (!values.ok) return { ok: false, message: values.error };

  const { name, email, password } = values;
  const db = getDb();
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) return { ok: false, message: "Ese correo ya está registrado." };

  const code = String(randomInt(1000, 10000));
  try {
    await db.registrationVerification.upsert({
      where: { email },
      update: {
        name,
        passwordHash: await bcrypt.hash(password, 12),
        codeHash: await bcrypt.hash(code, 10),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await sendRegistrationCode(email, name, code);
  } catch (error) {
    await db.registrationVerification.deleteMany({ where: { email } });
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos iniciar el registro." };
  }

  return { ok: true, message: "Enviamos un código de cuatro dígitos a tu correo.", step: "verify", email };
}

export async function verifyRegistrationAction(_: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const email = stringValue(formData, "email").toLowerCase();
  const code = stringValue(formData, "code");
  const db = getDb();
  const verification = await db.registrationVerification.findUnique({ where: { email } });

  if (!verification) return { ok: false, message: "No encontramos una verificación activa. Regístrate de nuevo.", step: "register" };
  if (verification.expiresAt < new Date()) {
    await db.registrationVerification.delete({ where: { id: verification.id } });
    return { ok: false, message: "El código expiró. Regístrate de nuevo.", step: "register" };
  }
  if (verification.attempts >= 5) {
    await db.registrationVerification.delete({ where: { id: verification.id } });
    return { ok: false, message: "Superaste el máximo de intentos. Regístrate de nuevo.", step: "register" };
  }
  if (!/^\d{4}$/.test(code) || !(await bcrypt.compare(code, verification.codeHash))) {
    await db.registrationVerification.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, message: "El código no es correcto.", step: "verify", email };
  }

  let onboardingInput: Parameters<typeof startOffOnboardingSafely>[0] | null = null;

  try {
    const [user, subscriber] = await db.$transaction([
      db.user.create({
        data: {
          name: verification.name,
          email: verification.email,
          passwordHash: verification.passwordHash,
          role: "USER",
        },
      }),
      db.subscriber.upsert({
        where: { email: verification.email },
        update: { name: verification.name, consent: true },
        create: { name: verification.name, email: verification.email, interest: "Todos", consent: true },
      }),
      db.registrationVerification.delete({ where: { id: verification.id } }),
    ]);

    onboardingInput = {
      email: user.email,
      name: user.name,
      userId: user.id,
      subscriberId: subscriber.id,
    };
  } catch {
    return { ok: false, message: "No pudimos terminar el registro. Intenta iniciar sesión.", step: "login" };
  }

  await startOffOnboardingSafely(onboardingInput);

  return { ok: true, message: "Cuenta verificada. Ya puedes iniciar sesión.", step: "login" };
}

export async function resendRegistrationCodeAction(_: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const email = stringValue(formData, "email").toLowerCase();
  const db = getDb();
  const verification = await db.registrationVerification.findUnique({ where: { email } });
  if (!verification) return { ok: false, message: "No encontramos una verificación activa.", step: "register" };

  const code = String(randomInt(1000, 10000));
  try {
    await sendRegistrationCode(email, verification.name, code);
    await db.registrationVerification.update({
      where: { id: verification.id },
      data: {
        codeHash: await bcrypt.hash(code, 10),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    return { ok: true, message: "Enviamos un código nuevo. Expira en 10 minutos.", step: "verify", email };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos reenviar el código.", step: "verify", email };
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/?logout=1");
}

export async function subscribeAction(_: unknown, formData: FormData) {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const interest = stringValue(formData, "interest");
  const consent = formData.get("consent") === "on";

  if (!name || !email || !interest) {
    return { ok: false, message: "Completa nombre, correo e interes principal." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Escribe un correo valido." };
  }

  if (!consent) {
    return { ok: false, message: "Necesitamos tu consentimiento para enviarte OFF." };
  }

  let onboardingInput: Parameters<typeof startOffOnboardingSafely>[0] | null = null;

  try {
    const db = getDb();
    const existingSubscriber = await db.subscriber.findUnique({
      where: { email },
      select: { id: true },
    });
    const subscriber = await db.subscriber.upsert({
      where: { email },
      update: { name, interest, consent },
      create: { name, email, interest, consent },
    });

    const user = await db.user.upsert({
      where: { email },
      update: { name },
      create: {
        name,
        email,
        passwordHash: await bcrypt.hash(`off-subscriber-${email}-${Date.now()}`, 12),
        role: "USER",
      },
    });

    await createSession(user.id);

    if (!existingSubscriber) {
      onboardingInput = {
        email: user.email,
        name: user.name,
        userId: user.id,
        subscriberId: subscriber.id,
      };
    }
  } catch {
    return { ok: false, message: "No pudimos guardar tu suscripcion. Intenta de nuevo." };
  }

  if (onboardingInput) {
    await startOffOnboardingSafely(onboardingInput);
  }

  revalidatePath("/");
  return {
    ok: true,
    message:
      "Bienvenido a OFF.\nUn espacio para cuestionar, reconstruir y volver a conectar con lo que realmente quieres construir.\nLa siguiente historia te espera.",
  };
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

export type AutosaveArticlePayload = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  readTime: string;
  status: string;
  featured: boolean;
};

export type AutosaveArticleState = SaveArticleState & {
  updatedAt?: string;
};

function contentVersions(content: string) {
  try {
    const parsed = JSON.parse(content) as {
      type?: string;
      translations?: Record<string, { content?: string }>;
    };
    if (parsed?.type === "off-article-translations" && parsed.translations) {
      return Object.values(parsed.translations).map((translation) => translation.content ?? "").filter(Boolean);
    }
  } catch {
    // Existing article formats continue through the normal validation path.
  }
  return [content];
}

function hasReadableArticleContent(content: string) {
  return contentVersions(content).some((version) => {
    try {
      const parsedContent = JSON.parse(version) as Array<Record<string, unknown>>;
      return Array.isArray(parsedContent) && parsedContent.some((block) => {
        if (typeof block.text === "string" && block.text.trim()) return true;
        if (typeof block.src === "string" && block.src.trim()) return true;
        if (Array.isArray(block.items) && block.items.length > 0) return true;
        if (typeof block.url === "string" && block.url.trim()) return true;
        if (typeof block.value === "string" && block.value.trim()) return true;
        if (typeof block.left === "string" && block.left.trim()) return true;
        if (Array.isArray(block.images) && block.images.length > 0) return true;
        return false;
      });
    } catch {
      return Boolean(version.trim());
    }
  });
}

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
      return { ok: false, message: "El artÃ­culo es demasiado pesado. Revisa imÃ¡genes insertadas." };
    }

    if (/data:image\/[a-zA-Z]+;base64,/.test(content)) {
      return { ok: false, message: "El artÃ­culo contiene imÃ¡genes en base64. Sube las imÃ¡genes correctamente antes de publicar." };
    }

    if (!hasReadableArticleContent(content)) return { ok: false, message: "Falta contenido." };

    if (content.length > 70000) {
      return { ok: false, message: "El contenido supera el lÃ­mite de 70,000 caracteres." };
    }

    if (!coverImage) return { ok: false, message: "Falta portada." };

    const db = getDb();
    const articleWithSlug = await db.article.findUnique({ where: { slug } });
    if (articleWithSlug && articleWithSlug.id !== id) {
      return { ok: false, message: "Ese slug ya existe. Cambia el slug antes de publicar." };
    }

    const existingArticle = id ? await db.article.findUnique({ where: { id } }) : null;
    if (id && !existingArticle) {
      return { ok: false, message: "No encontramos este artÃ­culo para actualizarlo." };
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

    if (featured && !isInternalContentCategory(category)) {
      await db.article.updateMany({
        where: id ? { NOT: { id } } : undefined,
        data: { featured: false },
      });
    }

    const article = id
      ? await db.article.update({ where: { id }, data })
      : await db.article.create({ data });

    if (status === "published" && !isInternalContentCategory(category)) {
      try {
        await deriveLoungeContentFromArticle(db, article);
      } catch (error) {
        console.error("No pudimos generar contenido derivado para Member Lounge.", error);
      }
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
    revalidatePath("/admin/new");

    return {
      ok: true,
      message: status === "published" ? "ArtÃ­culo publicado correctamente" : "Borrador guardado correctamente",
      articleId: article.id,
      slug: article.slug,
      status: article.status,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No pudimos guardar el artÃ­culo. Intenta de nuevo.",
    };
  }
}

export async function autosaveArticleAction(payload: AutosaveArticlePayload): Promise<AutosaveArticleState> {
  try {
    await requireAdmin();

    const id = payload.id?.trim() ?? "";
    const title = payload.title.trim();
    const slug = (payload.slug.trim() || slugify(title) || `borrador-${Date.now()}`).toLowerCase();
    const excerpt = payload.excerpt.trim();
    const content = payload.content.trim();
    const coverImage = payload.coverImage.trim();
    const category = payload.category.trim() || "Vida";
    const readTime = payload.readTime.trim() || "5 min leer";
    const featured = Boolean(payload.featured);

    if (!title && !excerpt && (!content || content === "[]" || content === "[{\"type\":\"paragraph\",\"text\":\"\"}]")) {
      return { ok: false, message: "No hay contenido suficiente para autoguardar." };
    }

    if (/data:image\/[a-zA-Z]+;base64,/.test(content)) {
      return { ok: false, message: "El articulo contiene imagenes en base64. Sube las imagenes correctamente." };
    }

    if (content.length > 70000) {
      return { ok: false, message: "El contenido supera el limite de 70,000 caracteres." };
    }

    const db = getDb();
    const existingArticle = id ? await db.article.findUnique({ where: { id } }) : null;
    const articleWithSlug = await db.article.findUnique({ where: { slug } });
    if (articleWithSlug && articleWithSlug.id !== id) {
      return { ok: false, message: "Ese slug ya existe. Cambia el slug antes de guardar." };
    }

    const data = {
      title: title || existingArticle?.title || "Sin titulo",
      slug,
      excerpt: excerpt || existingArticle?.excerpt || "Borrador editorial de OFF.",
      content: content || existingArticle?.content || JSON.stringify([{ type: "paragraph", text: "" }]),
      coverImage: coverImage || existingArticle?.coverImage || "/images/hero-off.webp",
      category,
      readTime,
      author: "Nathalie Garcia",
      status: payload.status === "published" ? "published" : "draft",
      featured,
      publishedAt: payload.status === "published" ? existingArticle?.publishedAt ?? new Date() : existingArticle?.publishedAt ?? null,
    };

    const article = existingArticle
      ? await db.article.update({ where: { id: existingArticle.id }, data })
      : await db.article.create({ data });

    revalidatePath("/admin");
    revalidatePath("/admin/new");
    revalidatePath("/");
    revalidatePath(`/off/${article.slug}`);

    return {
      ok: true,
      message: "Guardado",
      articleId: article.id,
      slug: article.slug,
      status: article.status,
      updatedAt: article.updatedAt.toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Error al guardar",
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

  await db.comment.deleteMany({ where: { articleId: id } });
  await db.article.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/new");
  revalidatePath(`/off/${article.slug}`);
  redirect("/admin?deleted=1");
}

export type SaveLoungeContentState = {
  ok: boolean;
  message: string;
  id?: string;
};

const LOUNGE_TYPES = ["LIBRARY", "SIGNAL", "RESOURCE", "NATHALIE_NOTE", "EARLY_ACCESS"] as const;

export async function saveLoungeContentAction(
  _: SaveLoungeContentState,
  formData: FormData,
): Promise<SaveLoungeContentState> {
  try {
    await requireAdmin();

    const id = stringValue(formData, "id");
    const type = stringValue(formData, "type") as (typeof LOUNGE_TYPES)[number];
    const title = stringValue(formData, "title");
    const number = stringValue(formData, "number") || null;
    const description = stringValue(formData, "description") || null;
    const content = stringValue(formData, "content") || null;
    const relatedArticle = stringValue(formData, "relatedArticle") || null;
    const releaseDateValue = stringValue(formData, "releaseDate");
    const statusLabel = stringValue(formData, "statusLabel") || null;
    const intent = stringValue(formData, "publishIntent");
    const status = intent === "publish" ? "published" : "draft";
    const links = stringValue(formData, "links")
      .split("\n")
      .map((line) => {
        const [label, ...urlParts] = line.split("|");
        return { label: label.trim(), url: urlParts.join("|").trim() };
      })
      .filter((link) => link.label || link.url);

    if (!LOUNGE_TYPES.includes(type)) return { ok: false, message: "Selecciona un formato editorial válido." };
    if (!title) return { ok: false, message: "Falta título." };
    const wordCount = content?.split(/\s+/).filter(Boolean).length ?? 0;
    if (type === "SIGNAL" && (wordCount < 100 || wordCount > 300)) {
      return { ok: false, message: "El Signal debe contener entre 100 y 300 palabras." };
    }
    if (type === "EARLY_ACCESS" && !releaseDateValue) {
      return { ok: false, message: "Falta fecha de lanzamiento." };
    }

    const db = getDb();
    const existing = id ? await db.loungeContent.findUnique({ where: { id } }) : null;
    if (id && !existing) return { ok: false, message: "No encontramos esta pieza editorial." };

    const data = {
      type,
      title,
      number,
      description,
      content,
      links,
      relatedArticle,
      releaseDate: releaseDateValue ? new Date(releaseDateValue) : null,
      statusLabel,
      status,
      publishedAt: status === "published" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
    };

    const item = existing
      ? await db.loungeContent.update({ where: { id: existing.id }, data })
      : await db.loungeContent.create({ data });

    revalidatePath("/admin");
    revalidatePath("/lounge");

    return {
      ok: true,
      message: status === "published" ? "Contenido publicado en Member Lounge." : "Borrador guardado.",
      id: item.id,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar el contenido." };
  }
}

export async function deleteLoungeContentAction(formData: FormData) {
  await requireAdmin();
  const id = stringValue(formData, "id");
  if (id) await getDb().loungeContent.deleteMany({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/lounge");
  redirect("/admin?loungeDeleted=1");
}

export async function commentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(stringValue(formData, "articlePath") || "/")}`);
  }

  const articleId = stringValue(formData, "articleId");
  const articleSlug = stringValue(formData, "articleSlug");
  const content = stringValue(formData, "content");
  const parentId = stringValue(formData, "parentId");

  if (!articleId || !articleSlug || content.length < 2) {
    return;
  }

  await getDb().comment.create({
    data: {
      articleId,
      userId: user.id,
      parentId: parentId || null,
      content,
      status: "PUBLISHED",
    },
  });

  revalidatePath(`/off/${articleSlug}`);
}

export async function topicSuggestionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(stringValue(formData, "articlePath") || "/")}`);
  }

  const articleId = stringValue(formData, "articleId");
  const articleSlug = stringValue(formData, "articleSlug");
  const content = stringValue(formData, "content");

  if (!content || content.length < 2) return;

  await getDb().topicSuggestion.create({
    data: {
      articleId: articleId || null,
      userId: user.id,
      content,
    },
  });

  revalidatePath("/admin");
  if (articleSlug) revalidatePath(`/off/${articleSlug}`);
}
