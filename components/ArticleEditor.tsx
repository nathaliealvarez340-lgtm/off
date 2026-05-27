"use client";

import type { Article } from "@prisma/client";
import { useMemo, useState } from "react";
import { saveArticleAction } from "@/app/actions";
import { slugify } from "@/lib/slug";

const defaultContent = JSON.stringify(
  [
    { type: "paragraph", text: "Escribe aquí la apertura editorial del capítulo." },
    { type: "h2", text: "Un título intermedio" },
    { type: "paragraph", text: "Desarrolla la idea sin convertirla en pared de texto." },
    { type: "special", label: "Reality Check", text: "Una idea incómoda, clara y útil." },
    { type: "quote", text: "Una frase que pueda quedarse en la cabeza del lector." },
    { type: "special", label: "Acción", text: "Una pregunta o ejercicio concreto para cerrar." }
  ],
  null,
  2,
);

export function ArticleEditor({ article }: { article?: Article | null }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const [slug, setSlug] = useState(article?.slug ?? generatedSlug);

  function handleTitle(value: string) {
    setTitle(value);
    if (!article?.slug) setSlug(slugify(value));
  }

  return (
    <form action={saveArticleAction} className="editor-form">
      <input name="id" type="hidden" value={article?.id ?? ""} />

      <div className="two-col">
        <label className="field">
          Título
          <input name="title" value={title} onChange={(event) => handleTitle(event.target.value)} required />
        </label>
        <label className="field">
          Slug
          <input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        </label>
      </div>

      <label className="field">
        Extracto
        <textarea name="excerpt" defaultValue={article?.excerpt ?? ""} required />
      </label>

      <div className="two-col">
        <label className="field">
          Categoría
          <input name="category" defaultValue={article?.category ?? "Vida"} required />
        </label>
        <label className="field">
          Tiempo estimado
          <input name="readTime" defaultValue={article?.readTime ?? "5 min leer"} required />
        </label>
      </div>

      <div className="two-col">
        <label className="field">
          Imagen de portada actual o URL
          <input name="coverImage" defaultValue={article?.coverImage ?? "/covers/off-chapter-1.svg"} required />
        </label>
        <label className="field">
          Subir portada
          <input name="coverFile" type="file" accept="image/*" />
        </label>
      </div>

      <label className="field">
        Contenido editorial JSON
        <textarea name="content" defaultValue={article?.content ?? defaultContent} required />
      </label>

      <div className="two-col">
        <label className="field">
          Estado
          <select name="status" defaultValue={article?.status ?? "draft"}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="checkbox">
          <input name="featured" type="checkbox" defaultChecked={article?.featured ?? false} />
          <span>Marcar como capítulo destacado</span>
        </label>
      </div>

      <div className="actions">
        <button className="button" type="submit">
          Guardar artículo
        </button>
        <a className="ghost-button" href="/admin">
          Cancelar
        </a>
      </div>
    </form>
  );
}
