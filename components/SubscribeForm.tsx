"use client";

import { useActionState, useEffect } from "react";
import { subscribeAction } from "@/app/actions";
import { useOffLanguage } from "@/components/useOffLanguage";

const initialState = { ok: false, message: "" };

export function SubscribeForm() {
  const [state, action, pending] = useActionState(subscribeAction, initialState);
  const { language } = useOffLanguage();

  useEffect(() => {
    if (!state.ok) return;
    const timeout = window.setTimeout(() => {
      window.location.href = "/?welcome=1#mi-espacio";
    }, 2600);
    return () => window.clearTimeout(timeout);
  }, [state.ok]);

  return (
    <form action={action} className="form-grid">
      <input name="preferredLanguage" type="hidden" value={language} />
      <label className="field">
        Nombre
        <input name="name" placeholder="Tu nombre" autoComplete="name" required />
      </label>
      <label className="field">
        Correo
        <input name="email" placeholder="tu@email.com" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Interés principal
        <select name="interest" defaultValue="Todos" required>
          <option>Vida</option>
          <option>Carrera</option>
          <option>Negocios</option>
          <option>Finanzas</option>
          <option>Mentalidad</option>
          <option>Todos</option>
        </select>
      </label>
      <label className="checkbox">
        <input name="consent" type="checkbox" required />
        <span>Acepto recibir capítulos y correos editoriales de OFF.</span>
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Guardando..." : "Quiero recibir OFF"}
      </button>
      <div className="status-message" role="status">
        {state.message.split("\n").map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </form>
  );
}
