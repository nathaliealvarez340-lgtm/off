import type { Article, Subscriber } from "@prisma/client";
import { getPlainTextPreview } from "./articles";
import { getSiteUrl } from "./site-url";

export async function sendArticleToSubscriber(article: Article, subscriber: Subscriber) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;

  if (!apiKey || !from) {
    return { skipped: true, reason: "Resend no está configurado" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: subscriber.email,
      subject: `Nuevo capítulo de OFF: ${getPlainTextPreview(article.title, 140)}`,
      html: `
        <div style="background:#09070d;color:#f8f7fb;font-family:Arial,sans-serif;padding:32px">
          <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:34px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(95,54,180,.12))">
            <p style="letter-spacing:.18em;text-transform:uppercase;color:#bda8ff;font-size:12px">OFF Editorial</p>
            <h1 style="font-size:36px;line-height:1.05;margin:8px 0 16px">${getPlainTextPreview(article.title, 180)}</h1>
            <p style="font-size:17px;line-height:1.65;color:#ddd7ea">${getPlainTextPreview(article.excerpt, 320)}</p>
            <a href="${getSiteUrl()}/off/${article.slug}" style="display:inline-block;margin-top:22px;background:#fff;color:#09070d;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Leer capítulo</a>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend respondió con ${response.status}`);
  }

  return { skipped: false };
}

export async function notifySubscribers(article: Article, subscribers: Subscriber[]) {
  const results = [];

  for (const subscriber of subscribers) {
    results.push(await sendArticleToSubscriber(article, subscriber));
  }

  return results;
}
