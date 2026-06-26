"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export function CompleteArticleButton({ articleId, initiallyCompleted }: { articleId: string; initiallyCompleted: boolean }) {
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [message, setMessage] = useState(initiallyCompleted ? "Este capítulo ya forma parte de tu recorrido." : "");
  const [pending, setPending] = useState(false);

  async function completeArticle() {
    if (completed || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/member/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const result = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "No pudimos registrar la lectura.");
      setCompleted(true);
      setMessage(result.message || "Lectura completada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos registrar la lectura.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={`article-completion ${completed ? "completed" : ""}`}>
      <button type="button" onClick={completeArticle} disabled={completed || pending}>
        <Check aria-hidden="true" />
        {pending ? "Guardando..." : completed ? "Completado" : "¡Completado!"}
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
