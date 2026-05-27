"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession, isAdminSession, validAdminCredentials } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifySubscribers } from "@/lib/newsletter";
import { slugify } from "@/lib/slug";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function requireAdmin() {
  if (!(await isAdminSession())) {
    redirect("/admin");
  }
}

export async function loginAction(_: unknown, formData: FormData) {
  const email = stringValue(formData, "email");
  const password = stringValue(formData, "password");

  if (!validAdminCredentials(email, password)) {
    return { ok: false, message: "Credenciales incorrectas." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin");
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
