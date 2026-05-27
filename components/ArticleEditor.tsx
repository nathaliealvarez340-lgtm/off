"use client";

import type { Article } from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { saveArticleAction, type SaveArticleState } from "@/app/actions";
import { slugify } from "@/lib/slug";

type EditorBlock = {
  id: string;
  type: "paragraph" | "h2" | "h3" | "quote" | "divider" | "image";
  text?: string;
  src?: string;
  alt?: string;
  caption?: string;
  align?: "full" | "center" | "left" | "right";
  preview?: string;
};

const LIMIT = 70000;
const initialState: SaveArticleState = { ok: false, message: "" };

function blockId() {
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeType(type: unknown): EditorBlock["type"] {
  if (type === "h2" || type === "h3" || type === "quote" || type === "divider" || type === "image") return type;
  return "paragraph";
}

function initialBlocks(content?: string): EditorBlock[] {
  if (!content) {
    return [{ id: blockId(), type: "paragraph", text: "" }];
  }

  try {
    const parsed = JSON.parse(content) as Array<Partial<EditorBlock>>;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((block) => ({
        id: blockId(),
        type: normalizeType(block.type),
        text: block.text ?? "",
        src: block.src,
        alt: block.alt ?? "",
        caption: block.caption ?? "",
        align: block.align ?? "center",
      }));
    }
  } catch {
    return content
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((text) => ({ id: blockId(), type: "paragraph", text }));
  }

  return [{ id: blockId(), type: "paragraph", text: "" }];
}

function toEditorialJson(blocks: EditorBlock[]) {
  return JSON.stringify(
    blocks
      .filter((block) => block.type === "divider" || block.type === "image" || block.text?.trim())
      .filter((block) => block.type !== "image" || block.src)
      .map((block) => {
        if (block.type === "divider") return { type: "divider" };
        if (block.type === "image") {
          return {
            type: "image",
            src: block.src || "",
            alt: block.alt || block.caption || "Imagen editorial",
            caption: block.caption || "",
            align: block.align || "center",
          };
        }
        if (block.type === "quote") return { type: "quote", text: block.text || "" };
        return { type: block.type, text: block.text || "" };
      }),
  );
}

function renderPreview(block: EditorBlock) {
  if (block.type === "divider") return <hr />;
  if (block.type === "image") {
    return (
      <figure className={`preview-image align-${block.align ?? "center"}`}>
        {block.preview || block.src ? <img src={block.preview || block.src} alt={block.alt || "Imagen editorial"} /> : null}
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.type === "h2") return <h2>{block.text}</h2>;
  if (block.type === "h3") return <h3>{block.text}</h3>;
  if (block.type === "quote") return <blockquote>{block.text}</blockquote>;
  return <p>{block.text}</p>;
}

export function ArticleEditor({ article }: { article?: Article | null }) {
  const [state, formAction, pending] = useActionState(saveArticleAction, initialState);
  const [savedId, setSavedId] = useState(article?.id ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const [slug, setSlug] = useState(article?.slug ?? generatedSlug);
  const [cover, setCover] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initialBlocks(article?.content));
  const [previewOpen, setPreviewOpen] = useState(false);
  const contentJson = useMemo(() => toEditorialJson(blocks), [blocks]);
  const characterCount = contentJson.length;
  const overLimit = characterCount > LIMIT;
  const viewSlug = state.slug ?? slug;

  useEffect(() => {
    if (state.articleId) setSavedId(state.articleId);
    if (state.slug) setSlug(state.slug);
  }, [state.articleId, state.slug]);

  function handleTitle(value: string) {
    setTitle(value);
    if (!article?.slug && !state.slug) setSlug(slugify(value));
  }

  function addBlock(type: EditorBlock["type"]) {
    setBlocks((current) => [...current, { id: blockId(), type, text: "", align: "center" }]);
  }

  function updateBlock(id: string, patch: Partial<EditorBlock>) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function removeBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function applyInline(mark: "bold" | "italic", id: string) {
    const token = mark === "bold" ? "**texto**" : "_texto_";
    updateBlock(id, { text: `${blocks.find((block) => block.id === id)?.text ?? ""}${token}` });
  }

  return (
    <form action={formAction} className="magazine-editor">
      <input name="id" type="hidden" value={savedId} />
      <input name="content" type="hidden" value={contentJson} />
      <input name="coverImage" type="hidden" value={cover} />

      <header className="editor-topbar">
        <div>
          <p className="eyebrow">Editor OFF</p>
          <h1>{article ? "Editar capítulo" : "Nuevo capítulo"}</h1>
        </div>
        <div className="editor-actions">
          <button className="ghost-button" type="button" onClick={() => setPreviewOpen((open) => !open)}>
            Vista previa
          </button>
          <a className="ghost-button" href="/admin">
            Cancelar
          </a>
          <button className="ghost-button" disabled={pending || overLimit} name="publishIntent" type="submit" value="draft">
            {pending ? "Guardando..." : "Guardar draft"}
          </button>
          <button className="button" disabled={pending || overLimit} name="publishIntent" type="submit" value="publish">
            {pending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </header>

      {state.message ? (
        <div className={state.ok ? "editor-notice success" : "editor-notice error"}>
          <span>{state.message}</span>
          {state.ok && state.status === "published" && viewSlug ? (
            <a href={`/off/${viewSlug}`} target="_blank">
              Ver artículo
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="editor-layout">
        <main className="editor-canvas">
          <input
            className="title-input"
            name="title"
            placeholder="Título del capítulo"
            value={title}
            onChange={(event) => handleTitle(event.target.value)}
            required
          />
          <textarea
            className="excerpt-input"
            name="excerpt"
            placeholder="Subtítulo o extracto editorial"
            defaultValue={article?.excerpt ?? ""}
            required
          />

          <div className="editor-toolbar">
            <button type="button" onClick={() => addBlock("paragraph")}>Párrafo</button>
            <button type="button" onClick={() => addBlock("h2")}>H2</button>
            <button type="button" onClick={() => addBlock("h3")}>H3</button>
            <button type="button" onClick={() => addBlock("quote")}>Cita</button>
            <button type="button" onClick={() => addBlock("divider")}>Separador</button>
            <button type="button" onClick={() => addBlock("image")}>Imagen</button>
          </div>

          <div className="block-list">
            {blocks.map((block) => (
              <section className={`editor-block block-${block.type}`} key={block.id}>
                <div className="block-controls">
                  <select value={block.type} onChange={(event) => updateBlock(block.id, { type: event.target.value as EditorBlock["type"] })}>
                    <option value="paragraph">Párrafo</option>
                    <option value="h2">H2</option>
                    <option value="h3">H3</option>
                    <option value="quote">Cita</option>
                    <option value="divider">Separador</option>
                    <option value="image">Imagen</option>
                  </select>
                  {block.type !== "image" && block.type !== "divider" ? (
                    <>
                      <button type="button" onClick={() => applyInline("bold", block.id)}>B</button>
                      <button type="button" onClick={() => applyInline("italic", block.id)}>I</button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => moveBlock(block.id, -1)}>Subir</button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)}>Bajar</button>
                  <button type="button" onClick={() => removeBlock(block.id)}>Eliminar</button>
                </div>

                {block.type === "divider" ? <hr /> : null}

                {block.type === "image" ? (
                  <div className="image-editor">
                    {block.preview || block.src ? <img src={block.preview || block.src} alt={block.alt || "Imagen"} /> : null}
                    <label className="field">
                      Subir imagen
                      <input
                        name={`blockImage-${block.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          updateBlock(block.id, {
                            src: `__UPLOAD__:blockImage-${block.id}`,
                            preview: URL.createObjectURL(file),
                          });
                        }}
                      />
                    </label>
                    <label className="field">
                      URL de imagen
                      <input value={block.src?.startsWith("__UPLOAD__") ? "" : block.src ?? ""} onChange={(event) => updateBlock(block.id, { src: event.target.value })} />
                    </label>
                    <label className="field">
                      Caption
                      <input value={block.caption ?? ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} />
                    </label>
                    <label className="field">
                      Alineación
                      <select value={block.align ?? "center"} onChange={(event) => updateBlock(block.id, { align: event.target.value as EditorBlock["align"] })}>
                        <option value="full">Ancho completo</option>
                        <option value="center">Centrada</option>
                        <option value="left">Izquierda</option>
                        <option value="right">Derecha</option>
                      </select>
                    </label>
                  </div>
                ) : null}

                {block.type !== "divider" && block.type !== "image" ? (
                  <textarea
                    className="block-textarea"
                    placeholder={block.type === "quote" ? "Escribe una cita..." : "Escribe aquí..."}
                    value={block.text ?? ""}
                    onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                  />
                ) : null}
              </section>
            ))}
          </div>

          {previewOpen ? (
            <section className="editor-preview">
              <p className="eyebrow">Vista previa</p>
              <h1>{title || "Título del capítulo"}</h1>
              <p className="preview-excerpt">Así se sentirá el inicio del artículo antes de publicarlo.</p>
              {blocks.map((block) => (
                <div key={block.id}>{renderPreview(block)}</div>
              ))}
            </section>
          ) : null}
        </main>

        <aside className="editor-sidebar">
          <div className="cover-uploader">
            <strong>Portada</strong>
            {coverPreview ? <img src={coverPreview} alt="Preview portada" /> : null}
            <label className="field">
              Ruta actual
              <input value={cover} onChange={(event) => { setCover(event.target.value); setCoverPreview(event.target.value); }} />
            </label>
            <label className="field">
              Subir portada
              <input
                name="coverFile"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setCoverPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            <button type="button" className="ghost-button" onClick={() => { setCover(""); setCoverPreview(""); }}>
              Quitar imagen
            </button>
          </div>

          <label className="field">
            Estado
            <select name="status" defaultValue={article?.status ?? "draft"}>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label className="field">
            Categoría
            <input name="category" defaultValue={article?.category ?? "Vida"} required />
          </label>
          <label className="field">
            Slug
            <input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </label>
          <label className="field">
            Tiempo estimado
            <input name="readTime" defaultValue={article?.readTime ?? "5 min leer"} required />
          </label>
          <label className="checkbox">
            <input name="featured" type="checkbox" defaultChecked={article?.featured ?? false} />
            <span>Destacado</span>
          </label>
          <div className={overLimit ? "character-count over" : "character-count"}>
            {characterCount.toLocaleString()} / {LIMIT.toLocaleString()} caracteres
          </div>
        </aside>
      </div>
    </form>
  );
}
