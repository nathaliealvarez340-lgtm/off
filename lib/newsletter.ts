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

type RegistrationLanguage = "es" | "en" | "it" | "pt";

const registrationConfirmationCopy: Record<RegistrationLanguage, {
  subject: string;
  eyebrow: string;
  greeting: (name: string) => string;
  created: string;
  codeLabel: string;
  access: string;
  security: string;
  signature: string;
}> = {
  es: {
    subject: "Tu acceso a OFF está listo",
    eyebrow: "OFF / Acceso confirmado",
    greeting: (name) => `Bienvenido a OFF, ${name}.`,
    created: "Tu cuenta fue creada correctamente.",
    codeLabel: "Tu código OFF es:",
    access: "Puedes usar tu correo junto con tu contraseña o tu código OFF para acceder a tu cuenta.",
    security: "Guárdalo en un lugar seguro.",
    signature: "— OFF",
  },
  en: {
    subject: "Your OFF access is ready",
    eyebrow: "OFF / Access confirmed",
    greeting: (name) => `Welcome to OFF, ${name}.`,
    created: "Your account was created successfully.",
    codeLabel: "Your OFF code is:",
    access: "You can access your account with your email and either your password or your OFF code.",
    security: "Keep it somewhere safe.",
    signature: "— OFF",
  },
  it: {
    subject: "Il tuo accesso a OFF è pronto",
    eyebrow: "OFF / Accesso confermato",
    greeting: (name) => `Benvenuto su OFF, ${name}.`,
    created: "Il tuo account è stato creato correttamente.",
    codeLabel: "Il tuo codice OFF è:",
    access: "Puoi accedere con la tua email e con la password oppure con il codice OFF.",
    security: "Conservalo in un luogo sicuro.",
    signature: "— OFF",
  },
  pt: {
    subject: "Seu acesso ao OFF está pronto",
    eyebrow: "OFF / Acesso confirmado",
    greeting: (name) => `Bem-vindo ao OFF, ${name}.`,
    created: "Sua conta foi criada corretamente.",
    codeLabel: "Seu código OFF é:",
    access: "Você pode acessar sua conta com seu email e sua senha ou com seu código OFF.",
    security: "Guarde-o em um lugar seguro.",
    signature: "— OFF",
  },
};

export async function sendRegistrationConfirmationEmail({
  to,
  name,
  accessCode,
  language,
}: {
  to: string;
  name: string;
  accessCode: string;
  language: RegistrationLanguage;
}) {
  const copy = registrationConfirmationCopy[language] ?? registrationConfirmationCopy.es;

  await sendEmail({
    to,
    subject: copy.subject,
    html: `
      <div style="background:#050407;color:#f8f7fb;font-family:Arial,sans-serif;padding:32px">
        <div style="max-width:560px;margin:0 auto;border:1px solid rgba(123,61,255,.3);border-radius:24px;padding:36px;background:#0b0910">
          <p style="letter-spacing:.2em;text-transform:uppercase;color:#bda8ff;font-size:11px">${escapeEmailHtml(copy.eyebrow)}</p>
          <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.05;margin:18px 0">${escapeEmailHtml(copy.greeting(name))}</h1>
          <p style="font-size:15px;line-height:1.7;color:#d7d1df">${escapeEmailHtml(copy.created)}</p>
          <p style="margin:24px 0 8px;font-size:14px;line-height:1.7;color:#d7d1df">${escapeEmailHtml(copy.codeLabel)}</p>
          <div style="border:1px solid rgba(123,61,255,.4);border-radius:18px;padding:20px;text-align:center;font-size:36px;font-weight:700;letter-spacing:.35em;color:#fff">${escapeEmailHtml(accessCode)}</div>
          <p style="margin-top:24px;font-size:14px;line-height:1.7;color:#d7d1df">${escapeEmailHtml(copy.access)}</p>
          <p style="font-size:13px;line-height:1.7;color:#9f98aa">${escapeEmailHtml(copy.security)}</p>
          <p style="margin-top:28px;font-family:Georgia,serif;color:#bda8ff">${escapeEmailHtml(copy.signature)}</p>
        </div>
      </div>
    `,
  });
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
