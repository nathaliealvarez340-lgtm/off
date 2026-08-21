"use client";

import type { LoungeContent, LoungeContentType } from "@prisma/client";
import { ArrowLeft, BookOpen, CalendarClock, Radio, Save, Sparkles, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteLoungeContentAction, saveLoungeContentAction, type SaveLoungeContentState } from "@/app/actions";
import { EditorialRichTextEditor } from "@/components/EditorialRichTextEditor";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OffEditorialFooter } from "@/components/OffEditorialFooter";
import { useOffLanguage } from "@/components/useOffLanguage";

const initialState: SaveLoungeContentState = { ok: false, message: "" };

const formats: Record<LoungeContentType, {
  label: string;
  eyebrow: string;
  icon: typeof BookOpen;
  description: string;
}> = {
  LIBRARY: { label: "Biblioteca", eyebrow: "Colección editorial", icon: BookOpen, description: "Agrupa lecturas y recursos dentro de un volumen curado." },
  SIGNAL: { label: "Signal", eyebrow: "Nota breve", icon: Radio, description: "Una idea directa de 100 a 300 palabras, sin estructura de capítulo." },
  RESOURCE: { label: "Recurso desbloqueado", eyebrow: "Recurso privado", icon: Sparkles, description: "Una herramienta, archivo o enlace útil para miembros." },
  NATHALIE_NOTE: { label: "Nota de Nathalie", eyebrow: "Nota privada", icon: StickyNote, description: "Una nota editorial íntima desde la editora de OFF." },
  EARLY_ACCESS: { label: "Early Access", eyebrow: "Próximamente en OFF", icon: CalendarClock, description: "Adelanta una próxima edición y su fecha de lanzamiento." },
};

function linksValue(item?: LoungeContent | null) {
  if (!Array.isArray(item?.links)) return "";
  return item.links
    .map((link) => {
      if (!link || typeof link !== "object" || Array.isArray(link)) return "";
      const value = link as { label?: unknown; url?: unknown };
      return `${String(value.label ?? "")}|${String(value.url ?? "")}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function LoungeContentEditor({ item, type }: { item?: LoungeContent | null; type: LoungeContentType }) {
  const [state, action, pending] = useActionState(saveLoungeContentAction, initialState);
  const [content, setContent] = useState(item?.content ?? "");
  const { language } = useOffLanguage();
  const format = formats[type];
  const Icon = format.icon;

  return (
    <main className="lounge-editor-shell">
      <header className="lounge-editor-topbar">
        <Link href="/admin" aria-label="Volver al admin"><ArrowLeft /></Link>
        <div>
          <span>{format.eyebrow}</span>
          <strong>{item ? `Editar ${format.label}` : `Nuevo ${format.label}`}</strong>
        </div>
        <LanguageSwitcher compact />
      </header>

      <form action={action} className="lounge-editor-form">
        <input name="id" type="hidden" value={item?.id ?? ""} />
        <input name="type" type="hidden" value={type} />

        <section className="lounge-editor-intro">
          <Icon aria-hidden="true" />
          <p>{format.description}</p>
        </section>

        <section className="lounge-editor-paper">
          {type === "NATHALIE_NOTE" ? <p className="lounge-note-label">Nota de Nathalie | Editora de OFF</p> : null}
          <label>
            <span>{type === "LIBRARY" ? "Título de colección" : type === "EARLY_ACCESS" ? "Próxima edición" : "Título"}</span>
            <input name="title" defaultValue={item?.title ?? ""} placeholder="Escribe un título..." required />
          </label>

          {["LIBRARY", "SIGNAL", "RESOURCE"].includes(type) ? (
            <label className="compact-field">
              <span>{type === "SIGNAL" ? "Número de Signal" : type === "LIBRARY" ? "Número de colección" : "Número"}</span>
              <input name="number" defaultValue={item?.number ?? ""} placeholder="001" />
            </label>
          ) : null}

          {type !== "SIGNAL" ? (
            <label>
              <span>{type === "EARLY_ACCESS" ? "Fragmento seleccionado" : "Descripción breve"}</span>
              <textarea name="description" defaultValue={item?.description ?? ""} rows={4} placeholder="Abre la intención de esta pieza..." />
            </label>
          ) : null}

          <label className="lounge-rich-field">
            <span>{type === "SIGNAL" ? "Texto del Signal" : type === "NATHALIE_NOTE" ? "Texto principal" : "Contenido editorial"}</span>
            <input name="content" type="hidden" value={content} readOnly />
            <EditorialRichTextEditor
              value={content}
              onChange={setContent}
              placeholder={type === "SIGNAL" ? "Escribe entre 100 y 300 palabras..." : "Escribe el contenido..."}
            />
          </label>

          <OffEditorialFooter language={language} sourceContent={content} protectedPreview />

          {["LIBRARY", "RESOURCE"].includes(type) ? (
            <label>
              <span>{type === "LIBRARY" ? "Artículos / recursos vinculados" : "Links / archivos descargables"}</span>
              <textarea name="links" defaultValue={linksValue(item)} rows={5} placeholder={"Nombre del recurso|https://... \nOtro recurso|/uploads/archivo.pdf"} />
              <small>Una línea por vínculo, usando: nombre|URL</small>
            </label>
          ) : null}

          {type === "NATHALIE_NOTE" ? (
            <label className="compact-field">
              <span>Artículo o sección relacionada</span>
              <input name="relatedArticle" defaultValue={item?.relatedArticle ?? ""} placeholder="/off/slug o #signals" />
            </label>
          ) : null}

          {type === "EARLY_ACCESS" ? (
            <div className="lounge-editor-grid">
              <label>
                <span>Fecha de lanzamiento</span>
                <input name="releaseDate" type="datetime-local" defaultValue={item?.releaseDate ? new Date(item.releaseDate).toISOString().slice(0, 16) : ""} required />
              </label>
              <label>
                <span>Estado</span>
                <select name="statusLabel" defaultValue={item?.statusLabel ?? "Próximamente"}>
                  <option>Próximamente</option>
                  <option>Disponible pronto</option>
                  <option>Acceso anticipado</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <footer className="lounge-editor-actions">
          <div className={state.ok ? "success" : "error"}>{state.message}</div>
          <button name="publishIntent" value="draft" type="submit" disabled={pending}><Save /> Guardar draft</button>
          <button className="primary" name="publishIntent" value="publish" type="submit" disabled={pending}>Publicar en {format.label}</button>
        </footer>
      </form>

      {item ? (
        <form action={deleteLoungeContentAction} className="lounge-editor-delete">
          <input name="id" type="hidden" value={item.id} />
          <button onClick={(event) => { if (!window.confirm("¿Seguro que quieres eliminar esta pieza? Esta acción no se puede deshacer.")) event.preventDefault(); }} type="submit"><Trash2 /> Eliminar pieza</button>
        </form>
      ) : null}
    </main>
  );
}
