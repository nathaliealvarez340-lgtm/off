"use server";

import { mkdir, writeFile } from "fs/promises";
import { createHash, randomBytes, randomInt } from "crypto";
import path from "path";
import bcrypt from "bcryptjs";
import { GalleryMusicSource, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession, createSession, getCurrentUser, hashToken, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  notifySubscribers,
  sendPasswordResetEmail,
  sendRegistrationConfirmationEmail,
} from "@/lib/newsletter";
import { startOffOnboardingSafely } from "@/lib/off-onboarding";
import { isInternalContentCategory } from "@/lib/articles";
import { deriveLoungeContentFromArticle } from "@/lib/lounge-automation";
import { slugify } from "@/lib/slug";
import { getSiteUrl } from "@/lib/site-url";
import { isUiLanguage, normalizeUiLanguage, type UiLanguage } from "@/lib/ui-i18n";
import { normalizeSearchKeywords } from "@/lib/search-keywords";
import { parseSpotifyTrackUrl } from "@/lib/spotify";
import { consumeRateLimit } from "@/lib/rate-limit";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nathaliegarcia@maiabusiness.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Ma1a2727!!@";

function accessCodeLookup(code: string) {
  const secret = process.env.USER_CODE_SECRET || process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "off-local-access-code-secret";
  return createHash("sha256").update(`off-access-code:${secret}:${code}`).digest("hex");
}

async function isAccessCodeAvailable(db: ReturnType<typeof getDb>, code: string) {
  const lookup = accessCodeLookup(code);
  const [user, registryEntry] = await Promise.all([
    db.user.findUnique({ where: { accessCodeLookup: lookup }, select: { id: true } }),
    db.accessCodeRegistry.findUnique({ where: { lookup }, select: { lookup: true } }),
  ]);
  return !user && !registryEntry;
}

async function generateUniqueAccessCode(db: ReturnType<typeof getDb>) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const code = String(randomInt(0, 10000)).padStart(4, "0");
    if (await isAccessCodeAvailable(db, code)) return code;
  }
  throw new Error("No pudimos generar un código único. Intenta de nuevo.");
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;
const INVALID_LOGIN_MESSAGE = "Los datos de acceso no son válidos.";

async function authThrottleKey(email: string, purpose = "login") {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.AUTH_SECRET || process.env.USER_CODE_SECRET || "off-auth-throttle";
  return createHash("sha256").update(`${purpose}:${secret}:${email}:${forwardedFor}`).digest("hex");
}

async function isLoginLocked(db: ReturnType<typeof getDb>, key: string) {
  const throttle = await db.authThrottle.findUnique({ where: { key } });
  if (!throttle) return false;
  if (throttle.lockedUntil && throttle.lockedUntil > new Date()) return true;
  if (throttle.lockedUntil) {
    await db.authThrottle.update({ where: { key }, data: { attempts: 0, lockedUntil: null } });
  }
  return false;
}

async function recordLoginFailure(db: ReturnType<typeof getDb>, key: string) {
  const current = await db.authThrottle.findUnique({ where: { key } });
  const attempts = (current?.attempts ?? 0) + 1;
  const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS
    ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
    : null;

  await db.authThrottle.upsert({
    where: { key },
    update: { attempts, lockedUntil },
    create: { key, attempts, lockedUntil },
  });
}

async function lockAuthThrottle(db: ReturnType<typeof getDb>, key: string, durationMs: number) {
  await db.authThrottle.upsert({
    where: { key },
    update: { attempts: MAX_LOGIN_ATTEMPTS, lockedUntil: new Date(Date.now() + durationMs) },
    create: { key, attempts: MAX_LOGIN_ATTEMPTS, lockedUntil: new Date(Date.now() + durationMs) },
  });
}

export async function loginAction(_: unknown, formData: FormData) {
  const email = stringValue(formData, "email").toLowerCase();
  const credential = stringValue(formData, "password");
  const next = stringValue(formData, "next") || "/";

  const db = getDb();
  const throttleKey = await authThrottleKey(email);
  if (await isLoginLocked(db, throttleKey)) {
    return { ok: false, message: `${INVALID_LOGIN_MESSAGE} Intenta de nuevo más tarde.` };
  }

  let user = await db.user.findUnique({ where: { email } });

  if (!user && email === ADMIN_EMAIL.toLowerCase() && credential === ADMIN_PASSWORD) {
    user = await db.user.create({
      data: {
        name: "Nathalie Garcia",
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(credential, 12),
        role: "ADMIN",
      },
    });
  }

  const passwordMatches = user ? await bcrypt.compare(credential, user.passwordHash) : false;
  const codeMatches = user?.accessCodeHash && /^\d{4}$/.test(credential)
    ? await bcrypt.compare(credential, user.accessCodeHash)
    : false;

  if (!user || (!passwordMatches && !codeMatches)) {
    await recordLoginFailure(db, throttleKey);
    return { ok: false, message: INVALID_LOGIN_MESSAGE };
  }

  await db.authThrottle.deleteMany({ where: { key: throttleKey } });
  await createSession(user.id, user.preferredLanguage);

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/lounge";
  redirect(safeNext === "/" ? "/lounge" : safeNext);
}

export type RegistrationState = {
  ok: boolean;
  message: string;
  step?: "register" | "success" | "login";
  email?: string;
  emailSent?: boolean;
  errorCode?: "REGISTER_FAILED" | "ACCESS_CODE_UNAVAILABLE" | "EMAIL_SEND_FAILED" | "INVALID_LANGUAGE";
};

export type AccessCodeState = {
  ok: boolean;
  status: "idle" | "invalid" | "available" | "occupied" | "error";
  message: string;
  code?: string;
};

export async function generateAvailableAccessCodeAction(): Promise<AccessCodeState> {
  try {
    const code = await generateUniqueAccessCode(getDb());
    return { ok: true, status: "available", message: "Código disponible", code };
  } catch {
    return { ok: false, status: "error", message: "No pudimos generar un código. Intenta de nuevo." };
  }
}

export async function checkAccessCodeAvailabilityAction(code: string): Promise<AccessCodeState> {
  const normalizedCode = code.replace(/\D/g, "").slice(0, 4);
  if (!/^\d{4}$/.test(normalizedCode)) {
    return { ok: false, status: "invalid", message: "Tu código debe tener exactamente 4 dígitos." };
  }

  try {
    const available = await isAccessCodeAvailable(getDb(), normalizedCode);
    return available
      ? { ok: true, status: "available", message: "Código disponible", code: normalizedCode }
      : { ok: false, status: "occupied", message: "Este código ya está en uso. Elige otro." };
  } catch {
    return { ok: false, status: "error", message: "No pudimos comprobar el código. Intenta de nuevo." };
  }
}

function validateRegistration(formData: FormData):
  | { ok: false; error: string }
  | { ok: true; name: string; email: string; password: string; accessCode: string; preferredLanguage: UiLanguage } {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();
  const password = stringValue(formData, "password");
  const repeatPassword = stringValue(formData, "repeatPassword");
  const accessCode = stringValue(formData, "accessCode");
  const preferredLanguage = stringValue(formData, "preferredLanguage");

  if (name.length < 2) return { ok: false, error: "Escribe tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Escribe un correo válido." };
  if (password.length < 6 || password.length > 8) return { ok: false, error: "La contraseña debe tener entre 6 y 8 caracteres." };
  if (password !== repeatPassword) return { ok: false, error: "Las contraseñas no coinciden." };
  if (!/^\d{4}$/.test(accessCode)) return { ok: false, error: "Elige un código OFF válido de 4 dígitos." };
  if (!isUiLanguage(preferredLanguage)) return { ok: false, error: "Selecciona un idioma disponible." };

  return { ok: true, name, email, password, accessCode, preferredLanguage };
}

export async function registerAction(_: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const values = validateRegistration(formData);
  if (!values.ok) {
    return {
      ok: false,
      message: values.error,
      errorCode: values.error.includes("idioma")
        ? "INVALID_LANGUAGE"
        : values.error.includes("código OFF")
          ? "ACCESS_CODE_UNAVAILABLE"
          : "REGISTER_FAILED",
    };
  }

  const { name, email, password, accessCode, preferredLanguage } = values;
  const db = getDb();
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) return { ok: false, message: "Ya existe una cuenta asociada a este correo.", errorCode: "REGISTER_FAILED" };
  if (!(await isAccessCodeAvailable(db, accessCode))) {
    return { ok: false, message: "Ese código acaba de ser utilizado. Elige otro.", errorCode: "ACCESS_CODE_UNAVAILABLE" };
  }

  const [passwordHash, accessCodeHash] = await Promise.all([
    bcrypt.hash(password, 12),
    bcrypt.hash(accessCode, 12),
  ]);
  const accessCodeLookupHash = accessCodeLookup(accessCode);
  let registeredUser: { id: string; email: string; name: string; preferredLanguage: string };
  let subscriberId: string;

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          accessCodeHash,
          accessCodeLookup: accessCodeLookupHash,
          preferredLanguage,
          role: "USER",
        },
        select: { id: true, email: true, name: true, preferredLanguage: true },
      });
      const subscriber = await tx.subscriber.upsert({
        where: { email },
        update: { name, consent: true },
        create: { name, email, interest: "Todos", consent: true },
        select: { id: true },
      });
      await tx.accessCodeRegistry.create({ data: { lookup: accessCodeLookupHash, userId: user.id } });
      return { user, subscriberId: subscriber.id };
    });
    registeredUser = result.user;
    subscriberId = result.subscriberId;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : String(error.meta?.target ?? "");
      if (target.includes("email")) {
        return { ok: false, message: "Ya existe una cuenta asociada a este correo.", errorCode: "REGISTER_FAILED" };
      }
      return { ok: false, message: "Ese código acaba de ser utilizado. Elige otro.", errorCode: "ACCESS_CODE_UNAVAILABLE" };
    }
    console.error("Registration failed", { error });
    return { ok: false, message: "No pudimos crear tu cuenta. Intenta de nuevo.", errorCode: "REGISTER_FAILED" };
  }

  await startOffOnboardingSafely({
    email: registeredUser.email,
    name: registeredUser.name,
    userId: registeredUser.id,
    subscriberId,
  });

  try {
    await sendRegistrationConfirmationEmail({
      to: registeredUser.email,
      name: registeredUser.name,
      accessCode,
      language: normalizeUiLanguage(registeredUser.preferredLanguage),
    });
    return {
      ok: true,
      message: "Tu cuenta fue creada correctamente. Enviamos tu código OFF a tu correo.",
      step: "success",
      email,
      emailSent: true,
    };
  } catch (error) {
    console.error("Registration email failed", { userId: registeredUser.id, error });
    return {
      ok: true,
      message: "Tu cuenta fue creada correctamente, pero no pudimos enviar el correo de confirmación.",
      step: "success",
      email,
      emailSent: false,
      errorCode: "EMAIL_SEND_FAILED",
    };
  }
}

export async function resendAccessCodeEmailAction(_: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const email = stringValue(formData, "email").toLowerCase();
  const accessCode = stringValue(formData, "accessCode");
  const db = getDb();
  const throttleKey = await authThrottleKey(email, "resend-access-code");

  if (await isLoginLocked(db, throttleKey)) {
    return { ok: false, message: "Espera un momento antes de solicitar otro correo.", step: "success", email };
  }

  const user = await db.user.findUnique({ where: { email } });
  const validCode = user?.accessCodeHash && /^\d{4}$/.test(accessCode)
    ? await bcrypt.compare(accessCode, user.accessCodeHash)
    : false;

  if (!user || !validCode) {
    await recordLoginFailure(db, throttleKey);
    return { ok: false, message: "No pudimos reenviar el código.", step: "success", email };
  }

  try {
    await sendRegistrationConfirmationEmail({
      to: user.email,
      name: user.name,
      accessCode,
      language: user.preferredLanguage === "en" || user.preferredLanguage === "it" || user.preferredLanguage === "pt"
        ? user.preferredLanguage
        : "es",
    });
    await lockAuthThrottle(db, throttleKey, 60 * 1000);
    return { ok: true, message: "Enviamos nuevamente tu código OFF.", step: "success", email, emailSent: true };
  } catch (error) {
    console.error("Registration email resend failed", { userId: user.id, error });
    return {
      ok: false,
      message: "No pudimos reenviar el correo en este momento.",
      step: "success",
      email,
      emailSent: false,
      errorCode: "EMAIL_SEND_FAILED",
    };
  }
}

export type PasswordRecoveryState = {
  ok: boolean;
  message: string;
};

const PASSWORD_RESET_REQUEST_MESSAGE =
  "Si los datos coinciden con una cuenta, recibirás un enlace para restablecer tu contraseña.";

export async function requestPasswordResetAction(
  _: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const name = stringValue(formData, "name");
  const email = stringValue(formData, "email").toLowerCase();

  if (!name || !email) {
    return { ok: false, message: "Completa nombre y correo." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Escribe un correo válido." };
  }
  if (!process.env.RESEND_API_KEY || !(process.env.OFF_FROM_EMAIL || process.env.FROM_EMAIL)) {
    return { ok: false, message: "La recuperación de contraseña no está disponible temporalmente." };
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  const normalizedName = name.replace(/\s+/g, " ").trim().toLocaleLowerCase("es-MX");
  const userName = user?.name.replace(/\s+/g, " ").trim().toLocaleLowerCase("es-MX");

  if (!user || normalizedName !== userName) {
    return { ok: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  try {
    await db.$transaction([
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      }),
    ]);

    const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
  } catch (error) {
    await db.passwordResetToken.deleteMany({ where: { tokenHash } });
    console.error("[password-reset] could not send recovery email", { userId: user.id, error });
  }

  return { ok: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
}

export async function resetPasswordAction(
  _: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const token = stringValue(formData, "token");
  const password = stringValue(formData, "password");
  const repeatPassword = stringValue(formData, "repeatPassword");

  if (!token) return { ok: false, message: "El enlace de recuperación no es válido." };
  if (password.length < 6 || password.length > 8) {
    return { ok: false, message: "La contraseña debe tener entre 6 y 8 caracteres." };
  }
  if (password !== repeatPassword) {
    return { ok: false, message: "Las contraseñas no coinciden." };
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date() || resetToken.attempts >= 5) {
    if (resetToken && !resetToken.usedAt && resetToken.attempts < 5) {
      await db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { attempts: { increment: 1 } },
      });
    }
    return { ok: false, message: "El enlace expiró o ya fue utilizado. Solicita uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.$transaction(async (transaction) => {
      const claimedToken = await transaction.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        data: { usedAt: new Date() },
      });

      if (claimedToken.count !== 1) throw new Error("Password reset token is no longer valid");

      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await transaction.session.deleteMany({ where: { userId: resetToken.userId } });
    });
  } catch {
    return { ok: false, message: "No pudimos actualizar tu contraseña. Solicita un enlace nuevo." };
  }

  return { ok: true, message: "Tu contraseña fue actualizada correctamente." };
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
  const requestedLanguage = stringValue(formData, "preferredLanguage");
  const preferredLanguage = isUiLanguage(requestedLanguage) ? requestedLanguage : "es";

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
        preferredLanguage,
        role: "USER",
      },
    });

    await createSession(user.id, user.preferredLanguage);

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
  keywords: string[];
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
    const keywords = normalizeSearchKeywords(formData.get("keywords"));
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
      keywords,
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
      message: error instanceof Error ? error.message : "No se pudo publicar exitosamente. Intenta de nuevo.",
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
    const keywords = normalizeSearchKeywords(payload.keywords);

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
      keywords,
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
    const keywords = normalizeSearchKeywords(formData.get("keywords"));
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
      keywords,
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

export type SaveGalleryPostState = {
  ok: boolean;
  message: string;
  id?: string;
};

const GALLERY_CATEGORIES = ["EXPLORE", "CONFESSIONS", "PEOPLE", "START_HERE", "TWENTIES"] as const;
const GALLERY_MEDIA_TYPES = ["IMAGE", "VIDEO"] as const;

function isSafeMediaUrl(value: string) {
  if (!value || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return value.startsWith("/") && !value.startsWith("//");
  }
}

function galleryTransformValue(value: string): Prisma.InputJsonValue {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const rotationValue = Number(parsed.rotation);
    return {
      x: Math.min(100, Math.max(0, Number(parsed.x) || 50)),
      y: Math.min(100, Math.max(0, Number(parsed.y) || 50)),
      zoom: Math.min(3, Math.max(1, Number(parsed.zoom) || 1)),
      rotation: [0, 90, 180, 270].includes(rotationValue) ? rotationValue : 0,
      flipX: parsed.flipX === true,
      flipY: parsed.flipY === true,
    };
  } catch {
    return { x: 50, y: 50, zoom: 1, rotation: 0, flipX: false, flipY: false };
  }
}

export async function saveGalleryPostAction(
  _: SaveGalleryPostState,
  formData: FormData,
): Promise<SaveGalleryPostState> {
  try {
    await requireAdmin();
    const id = stringValue(formData, "id");
    const mediaType = stringValue(formData, "mediaType") as (typeof GALLERY_MEDIA_TYPES)[number];
    const mediaUrl = stringValue(formData, "mediaUrl");
    const thumbnailUrl = stringValue(formData, "thumbnailUrl") || null;
    const title = stringValue(formData, "title").replace(/<[^>]*>/g, "").slice(0, 160) || null;
    const caption = stringValue(formData, "caption").replace(/<[^>]*>/g, "").slice(0, 2000) || null;
    const altText = stringValue(formData, "altText").replace(/<[^>]*>/g, "").slice(0, 300) || null;
    const mediaTransform = galleryTransformValue(stringValue(formData, "mediaTransform"));
    const requestedMusicSource = stringValue(formData, "musicSource");
    const submittedAudioUrl = stringValue(formData, "audioUrl") || null;
    const submittedSpotifyUrl = stringValue(formData, "spotifyUrl");
    const submittedAudioTitle = stringValue(formData, "audioTitle").replace(/<[^>]*>/g, "").slice(0, 160) || null;
    const submittedAudioArtist = stringValue(formData, "audioArtist").replace(/<[^>]*>/g, "").slice(0, 160) || null;
    const keywords = normalizeSearchKeywords(formData.get("keywords"));
    const category = stringValue(formData, "category") as (typeof GALLERY_CATEGORIES)[number];
    const status = stringValue(formData, "publishIntent") === "publish" ? "published" : "draft";

    if (requestedMusicSource && !["NONE", "UPLOAD", "SPOTIFY"].includes(requestedMusicSource)) {
      return { ok: false, message: "Selecciona una fuente de música válida." };
    }
    const spotifyTrack = requestedMusicSource === "SPOTIFY" ? parseSpotifyTrackUrl(submittedSpotifyUrl) : null;
    if (requestedMusicSource === "SPOTIFY" && !spotifyTrack) {
      return { ok: false, message: "Pega un enlace válido de una canción de Spotify." };
    }
    if (requestedMusicSource === "UPLOAD" && (!submittedAudioUrl || !isSafeMediaUrl(submittedAudioUrl))) {
      return { ok: false, message: "Sube un archivo de música válido." };
    }
    const musicSource = requestedMusicSource === "UPLOAD"
      ? GalleryMusicSource.UPLOAD
      : requestedMusicSource === "SPOTIFY"
        ? GalleryMusicSource.SPOTIFY
        : null;
    const audioUrl = musicSource === "UPLOAD" ? submittedAudioUrl : null;
    const spotifyUrl = musicSource === "SPOTIFY" ? spotifyTrack?.url ?? null : null;
    const spotifyTrackId = musicSource === "SPOTIFY" ? spotifyTrack?.trackId ?? null : null;
    const audioTitle = musicSource ? submittedAudioTitle : null;
    const audioArtist = musicSource ? submittedAudioArtist : null;

    if (!GALLERY_MEDIA_TYPES.includes(mediaType)) return { ok: false, message: "Selecciona un tipo de media válido." };
    if (!GALLERY_CATEGORIES.includes(category)) return { ok: false, message: "Selecciona una categoría válida." };
    if (!isSafeMediaUrl(mediaUrl)) return { ok: false, message: "Sube una imagen o video válido antes de guardar." };
    if (thumbnailUrl && !isSafeMediaUrl(thumbnailUrl)) return { ok: false, message: "El poster del video no es válido." };
    if (status === "published" && !caption) return { ok: false, message: "Agrega un caption antes de publicar." };

    const db = getDb();
    const existing = id ? await db.galleryPost.findUnique({ where: { id } }) : null;
    if (id && !existing) return { ok: false, message: "No encontramos esta publicación visual." };
    const data = {
      mediaType,
      mediaUrl,
      thumbnailUrl,
      title,
      caption,
      altText,
      category,
      mediaTransform,
      audioUrl,
      audioTitle,
      audioArtist,
      musicSource,
      spotifyUrl,
      spotifyTrackId,
      keywords,
      status,
      publishedAt: status === "published" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
    };
    const post = existing
      ? await db.galleryPost.update({ where: { id: existing.id }, data })
      : await db.galleryPost.create({ data });

    revalidatePath("/admin");
    revalidatePath("/lounge");
    revalidatePath(`/off/post/${post.id}`);
    return {
      ok: true,
      id: post.id,
      message: status === "published" ? "Publicación visual publicada correctamente." : "Borrador visual guardado.",
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No pudimos guardar la publicación visual." };
  }
}

export async function deleteGalleryPostAction(formData: FormData) {
  await requireAdmin();
  const id = stringValue(formData, "id");
  if (id) await getDb().galleryPost.deleteMany({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/lounge");
  revalidatePath(`/off/post/${id}`);
  redirect("/admin?galleryDeleted=1");
}

export async function toggleGalleryPostStatusAction(formData: FormData) {
  await requireAdmin();
  const id = stringValue(formData, "id");
  const post = id ? await getDb().galleryPost.findUnique({ where: { id } }) : null;
  if (!post) return;
  const status = post.status === "published" ? "draft" : "published";
  await getDb().galleryPost.update({ where: { id: post.id }, data: { status, publishedAt: status === "published" ? post.publishedAt ?? new Date() : post.publishedAt } });
  revalidatePath("/admin");
  revalidatePath("/lounge");
  revalidatePath(`/off/post/${post.id}`);
}

export type CommunityActionState = {
  ok: boolean;
  message: string;
};

const COMMUNITY_GREETING_TITLE = "Un saludo desde OFF";

function communityGreetingMessage(name: string) {
  return `Hola, ${name}. Me da mucho gusto saludarte y saber que estás aquí. OFF también se construye con las personas que lo leen, lo cuestionan y regresan cuando necesitan apagar un poco el ruido. Espero que encuentres algo aquí que valga la pena llevarte contigo. Nos seguimos leyendo.`;
}

export async function sendCommunityGreetingAction(userId: string): Promise<CommunityActionState> {
  try {
    await requireAdmin();
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) return { ok: false, message: "No encontramos a este usuario." };

    const db = getDb();
    const targetUser = await db.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true, name: true, role: true },
    });

    if (!targetUser) return { ok: false, message: "Este suscriptor todavía no tiene una cuenta para recibir saludos." };
    if (targetUser.role === "ADMIN") {
      return { ok: false, message: "Las cuentas de administrador requieren una gestión independiente." };
    }

    await db.notification.create({
      data: {
        userId: targetUser.id,
        type: "ADMIN_GREETING",
        title: COMMUNITY_GREETING_TITLE,
        message: communityGreetingMessage(targetUser.name),
      },
    });

    revalidatePath("/lounge");
    return { ok: true, message: `Saludo enviado a ${targetUser.name}.` };
  } catch (error) {
    console.error("No se pudo crear el saludo de Comunidad.", error);
    return { ok: false, message: "No se pudo enviar el saludo. Intenta de nuevo." };
  }
}

export async function markNotificationReadAction(notificationId: string): Promise<CommunityActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Inicia sesión para actualizar esta notificación." };

    const result = await getDb().notification.updateMany({
      where: { id: notificationId.trim(), userId: user.id, read: false },
      data: { read: true },
    });

    if (result.count === 0) return { ok: false, message: "La notificación ya no está disponible." };
    revalidatePath("/lounge");
    return { ok: true, message: "Notificación leída." };
  } catch (error) {
    console.error("No se pudo marcar la notificación como leída.", error);
    return { ok: false, message: "No se pudo cerrar el saludo. Intenta de nuevo." };
  }
}

export async function deleteCommunityMember(
  targetId: string,
  targetKind: "user" | "subscriber" = "user",
): Promise<CommunityActionState> {
  try {
    const currentAdmin = await requireAdmin();
    const normalizedTargetId = targetId.trim();
    if (!normalizedTargetId) return { ok: false, message: "No encontramos a este usuario." };

    const db = getDb();
    const result = await db.$transaction(async (tx) => {
      const subscriber = targetKind === "subscriber"
        ? await tx.subscriber.findUnique({ where: { id: normalizedTargetId } })
        : null;

      let targetUser = targetKind === "user"
        ? await tx.user.findUnique({
            where: { id: normalizedTargetId },
            select: { id: true, email: true, role: true },
          })
        : null;

      if (!targetUser && subscriber) {
        targetUser = await tx.user.findFirst({
          where: { email: { equals: subscriber.email.trim().toLowerCase(), mode: "insensitive" } },
          select: { id: true, email: true, role: true },
        });
      }

      if (!targetUser && !subscriber) return { deleted: false, reason: "missing" as const };

      if (targetUser?.id === currentAdmin.id) return { deleted: false, reason: "self" as const };
      if (targetUser?.role === "ADMIN") return { deleted: false, reason: "admin" as const };

      if (targetUser) {
        const normalizedEmail = targetUser.email.trim().toLowerCase();
        await tx.subscriber.deleteMany({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        });
        await tx.user.delete({ where: { id: targetUser.id } });
        return { deleted: true, reason: null };
      }

      await tx.subscriber.delete({ where: { id: subscriber!.id } });
      return { deleted: true, reason: null };
    });

    if (!result.deleted) {
      if (result.reason === "self") return { ok: false, message: "No puedes eliminar tu propia cuenta desde Comunidad." };
      if (result.reason === "admin") return { ok: false, message: "Las cuentas de administrador requieren una gestión independiente." };
      return { ok: false, message: "No encontramos a este usuario." };
    }

    revalidatePath("/admin");
    revalidatePath("/lounge");
    revalidatePath("/");
    return { ok: true, message: "Usuario eliminado permanentemente." };
  } catch (error) {
    console.error("No se pudo eliminar permanentemente al miembro de Comunidad.", error);
    return { ok: false, message: "No se pudo eliminar al usuario. Intenta de nuevo." };
  }
}

export async function commentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(stringValue(formData, "articlePath") || "/")}`);
  }

  const articleId = stringValue(formData, "articleId");
  const articleSlug = stringValue(formData, "articleSlug");
  const content = stringValue(formData, "content").replace(/<[^>]*>/g, "").slice(0, 1000);
  const requestedParentId = stringValue(formData, "parentId");

  if (!articleId || !articleSlug || content.length < 2) {
    return;
  }

  if (!await consumeRateLimit("article-comment", user.id, 8, 60_000)) return;

  const db = getDb();
  const article = await db.article.findFirst({ where: { id: articleId, slug: articleSlug, status: "published" }, select: { id: true } });
  if (!article) return;
  const parent = requestedParentId ? await db.comment.findFirst({ where: { id: requestedParentId, articleId }, select: { id: true, parentId: true, userId: true } }) : null;
  if (requestedParentId && !parent) return;
  const parentId = parent?.parentId ?? parent?.id ?? null;

  const comment = await db.comment.create({
    data: {
      articleId,
      userId: user.id,
      parentId: parentId || null,
      content,
      status: "PUBLISHED",
    },
  });

  if (parent && parent.userId !== user.id) {
    await db.notification.create({ data: { userId: parent.userId, type: "COMMENT_REPLY", title: "Nueva respuesta", message: `${user.name} respondió a tu comentario.`, href: `/off/${articleSlug}#comment-${comment.id}` } });
  }

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

export async function moderateSocialContentAction(formData: FormData) {
  await requireAdmin();
  const targetType = stringValue(formData, "targetType");
  const targetId = stringValue(formData, "targetId");
  const mode = stringValue(formData, "mode") === "delete" ? "delete" : "hide";
  if (!targetId) return;
  const db = getDb();

  if (targetType === "COMMUNITY_POST") {
    if (mode === "delete") await db.communityPost.deleteMany({ where: { id: targetId } });
    else await db.communityPost.updateMany({ where: { id: targetId }, data: { status: "hidden" } });
  } else if (targetType === "COMMUNITY_COMMENT") {
    if (mode === "delete") await db.communityComment.deleteMany({ where: { id: targetId } });
    else await db.communityComment.updateMany({ where: { id: targetId }, data: { status: "PENDING" } });
  } else if (targetType === "GALLERY_COMMENT") {
    if (mode === "delete") await db.galleryPostComment.deleteMany({ where: { id: targetId } });
    else await db.galleryPostComment.updateMany({ where: { id: targetId }, data: { status: "PENDING" } });
  } else return;

  await db.socialReport.updateMany({ where: { targetType, targetId, status: "pending" }, data: { status: mode === "delete" ? "removed" : "hidden" } });
  revalidatePath("/admin/community");
  revalidatePath("/lounge/community");
  revalidatePath("/lounge");
}

function themeValues(formData: FormData) {
  return stringValue(formData, "themes").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 15);
}

export async function saveEditorialConversationAction(formData: FormData) {
  await requireAdmin(); const id = stringValue(formData, "id"); const question = stringValue(formData, "question").slice(0, 500); const internalTitle = stringValue(formData, "internalTitle").slice(0, 160); if (!question || !internalTitle) return;
  const status = stringValue(formData, "status") === "published" ? "published" : "draft"; const data = { internalTitle, question, introduction: stringValue(formData, "introduction").slice(0, 1000) || null, themes: themeValues(formData), status, featured: formData.get("featured") === "on", publishedAt: status === "published" ? new Date() : null, closesAt: stringValue(formData, "closesAt") ? new Date(stringValue(formData, "closesAt")) : null };
  if (id) await getDb().editorialConversation.updateMany({ where: { id }, data }); else await getDb().editorialConversation.create({ data }); revalidatePath("/admin/intelligence"); revalidatePath("/lounge/community");
}

export async function saveRitualAction(formData: FormData) {
  await requireAdmin(); const id = stringValue(formData, "id"); const title = stringValue(formData, "title").slice(0, 160); const prompt = stringValue(formData, "prompt").slice(0, 600); if (!title || !prompt) return; const activeFrom = new Date(stringValue(formData, "activeFrom")); const activeUntil = new Date(stringValue(formData, "activeUntil")); if (Number.isNaN(activeFrom.getTime()) || Number.isNaN(activeUntil.getTime())) return; const data = { title, prompt, themes: themeValues(formData), activeFrom, activeUntil, status: stringValue(formData, "status") === "published" ? "published" : "draft" }; if (id) await getDb().ritual.updateMany({ where: { id }, data }); else await getDb().ritual.create({ data }); revalidatePath("/admin/intelligence"); revalidatePath("/lounge");
}

export async function saveOffIrlEventAction(formData: FormData) {
  await requireAdmin(); const id = stringValue(formData, "id"); const title = stringValue(formData, "title").slice(0, 160); const description = stringValue(formData, "description").slice(0, 3000); const startAt = new Date(stringValue(formData, "startAt")); const endAt = new Date(stringValue(formData, "endAt")); if (!title || !description || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return; const requested = stringValue(formData, "status"); const status = requested === "PUBLISHED" || requested === "CANCELLED" || requested === "COMPLETED" ? requested : "DRAFT"; const data = { title, description, locationName: stringValue(formData, "locationName") || null, city: stringValue(formData, "city") || null, country: stringValue(formData, "country") || null, startAt, endAt, capacity: Number(stringValue(formData, "capacity")) || null, image: stringValue(formData, "image") || null, externalMapUrl: stringValue(formData, "externalMapUrl") || null, status: status as "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED", registrationOpen: formData.get("registrationOpen") === "on", publishedAt: status === "PUBLISHED" ? new Date() : null }; if (id) await getDb().offIrlEvent.updateMany({ where: { id }, data }); else await getDb().offIrlEvent.create({ data }); revalidatePath("/admin/intelligence");
}

export async function moderateEditorialReplyAction(formData: FormData) { await requireAdmin(); const id = stringValue(formData, "id"); const action = stringValue(formData, "moderation"); if (action === "hide") await getDb().editorialConversationReply.updateMany({ where: { id }, data: { status: "PENDING" } }); else if (action === "feature") await getDb().editorialConversationReply.updateMany({ where: { id }, data: { featured: true } }); else if (action === "pin") await getDb().editorialConversationReply.updateMany({ where: { id }, data: { pinned: true } }); else if (action === "delete") await getDb().editorialConversationReply.deleteMany({ where: { id } }); revalidatePath("/admin/intelligence"); revalidatePath("/lounge/community"); }

export async function assignArticleThemesAction(formData: FormData) {
  await requireAdmin();
  const id = stringValue(formData, "articleId");
  if (!id) return;
  await getDb().article.updateMany({ where: { id }, data: { themes: themeValues(formData) } });
  revalidatePath("/admin/intelligence");
  revalidatePath("/lounge/map");
}
