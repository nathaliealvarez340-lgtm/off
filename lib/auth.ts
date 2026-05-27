import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "off_admin_session";

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "off-local-development-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function isAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [value, signature] = raw.split(".");
  if (!value || !signature) return false;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value)));
  } catch {
    return false;
  }
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const value = `admin:${Date.now()}`;
  cookieStore.set(COOKIE_NAME, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function validAdminCredentials(email: string, password: string) {
  return (
    email === (process.env.ADMIN_EMAIL || "nathalie@example.com") &&
    password === (process.env.ADMIN_PASSWORD || "off-admin-demo")
  );
}
