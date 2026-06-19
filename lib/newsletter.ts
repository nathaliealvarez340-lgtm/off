import type { Article, Subscriber } from "@prisma/client";
import { getPlainTextPreview } from "./articles";
import { getSiteUrl } from "./site-url";

function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function getFromEmail() {
  return process.env.OFF_FROM_EMAIL || process.env.FROM_EMAIL;
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromEmail();

  if (!apiKey || !from) {
    throw new Error("Resend no esta configurado.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    throw new Error(`Resend respondio con ${response.status}`);
  }
}

export async function sendArticleToSubscriber(article: Article, subscriber: Subscriber) {
  if (!process.env.RESEND_API_KEY || !getFromEmail()) {
    return { skipped: true, reason: "Resend no esta configurado" };
  }

  await sendEmail({
    to: subscriber.email,
    subject: `Nuevo capitulo de OFF: ${getPlainTextPreview(article.title, 140)}`,
    html: `
      <div style="background:#09070d;color:#f8f7fb;font-family:Arial,sans-serif;padding:32px">
        <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:34px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(95,54,180,.12))">
          <p style="letter-spacing:.18em;text-transform:uppercase;color:#bda8ff;font-size:12px">OFF Editorial</p>
          <h1 style="font-size:36px;line-height:1.05;margin:8px 0 16px">${escapeEmailHtml(getPlainTextPreview(article.title, 180))}</h1>
          <p style="font-size:17px;line-height:1.65;color:#ddd7ea">${escapeEmailHtml(getPlainTextPreview(article.excerpt, 320))}</p>
          <a href="${getSiteUrl()}/off/${article.slug}" style="display:inline-block;margin-top:22px;background:#fff;color:#09070d;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Leer capitulo</a>
        </div>
      </div>
    `,
  });

  return { skipped: false };
}

export async function notifySubscribers(article: Article, subscribers: Subscriber[]) {
  const results = [];

  for (const subscriber of subscribers) {
    results.push(await sendArticleToSubscriber(article, subscriber));
  }

  return results;
}

export async function sendRegistrationCode(email: string, name: string, code: string, accessCode?: string) {
  try {
    await sendEmail({
      to: email,
      subject: "Tu codigo para entrar a OFF",
      html: `
        <div style="background:#050407;color:#f8f7fb;font-family:Arial,sans-serif;padding:32px">
          <div style="max-width:560px;margin:0 auto;border:1px solid rgba(123,61,255,.3);border-radius:24px;padding:36px;background:#0b0910">
            <p style="letter-spacing:.2em;text-transform:uppercase;color:#bda8ff;font-size:11px">OFF / Verificacion</p>
            <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.05;margin:18px 0">Hola, ${escapeEmailHtml(name)}.</h1>
            <p style="font-size:15px;line-height:1.7;color:#d7d1df">Usa este codigo para terminar de crear tu cuenta. Expira en 10 minutos.</p>
            <div style="margin:28px 0;border:1px solid rgba(123,61,255,.4);border-radius:18px;padding:20px;text-align:center;font-size:36px;font-weight:700;letter-spacing:.35em;color:#fff">${code}</div>
            ${accessCode ? `<p style="font-size:14px;line-height:1.7;color:#d7d1df">Tu codigo unico de acceso a OFF es <strong style="color:#fff;letter-spacing:.18em">${escapeEmailHtml(accessCode)}</strong>. Guardalo: podras iniciar sesion con este codigo o con tu contrasena.</p>` : ""}
            <p style="font-size:12px;line-height:1.6;color:#8f8998">Si no solicitaste este acceso, puedes ignorar este correo.</p>
          </div>
        </div>
      `,
    });
  } catch {
    throw new Error("No pudimos enviar el codigo de verificacion. Intenta de nuevo.");
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
  try {
    await sendEmail({
      to: email,
      subject: "Recuperación de acceso OFF",
      html: `
        <div style="background:#050407;color:#f8f7fb;font-family:Arial,sans-serif;padding:32px">
          <div style="max-width:560px;margin:0 auto;border:1px solid rgba(123,61,255,.3);border-radius:24px;padding:36px;background:#0b0910">
            <p style="letter-spacing:.2em;text-transform:uppercase;color:#bda8ff;font-size:11px">OFF / Recuperacion</p>
            <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.05;margin:18px 0">Hola, ${escapeEmailHtml(name)}.</h1>
            <p style="font-size:15px;line-height:1.7;color:#d7d1df">Recibimos una solicitud para cambiar tu contrasena. Este enlace expira en 30 minutos y solo puede utilizarse una vez.</p>
            <a href="${escapeEmailHtml(resetUrl)}" style="display:inline-block;margin-top:22px;background:#7b3dff;color:#fff;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Crear nueva contrasena</a>
            <p style="margin-top:28px;font-size:12px;line-height:1.6;color:#8f8998">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        </div>
      `,
    });
  } catch {
    throw new Error("No pudimos enviar el correo de recuperacion.");
  }
}
