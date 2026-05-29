"use client";

import type { Article } from "@prisma/client";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveArticleAction, type SaveArticleState } from "@/app/actions";
import { slugify } from "@/lib/slug";

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "pullquote"
  | "list"
  | "numbered"
  | "checklist"
  | "code"
  | "divider"
  | "image"
  | "video"
  | "embed"
  | "gallery"
  | "collage"
  | "cta"
  | "subscribe"
  | "share"
  | "insight"
  | "stat"
  | "highlight"
  | "columns";

type EditorBlock = {
  id: string;
  type: BlockType;
  text?: string;
  src?: string;
  alt?: string;
  caption?: string;
  align?: "full" | "center" | "left" | "right" | "image-left" | "image-right";
  color?: string;
  highlightColor?: string;
  preview?: string;
  url?: string;
  label?: string;
  value?: string;
  items?: string;
  left?: string;
  right?: string;
};

const LIMIT = 70000;
const initialState: SaveArticleState = { ok: false, message: "" };
const inlineTags = ["strong", "em", "u", "s", "mark", "a", "br"] as const;

const textBlocks: Array<{ label: string; type: BlockType }> = [
  { label: "Parrafo", type: "paragraph" },
  { label: "H1", type: "h1" },
  { label: "H2", type: "h2" },
  { label: "H3", type: "h3" },
  { label: "Cita", type: "quote" },
  { label: "Bullets", type: "list" },
  { label: "Numerada", type: "numbered" },
  { label: "Checklist", type: "checklist" },
  { label: "Codigo", type: "code" },
  { label: "Divider", type: "divider" },
];

const mediaBlocks: Array<{ label: string; type: BlockType }> = [
  { label: "Imagen", type: "image" },
  { label: "Video", type: "video" },
  { label: "Embed", type: "embed" },
  { label: "Galeria", type: "gallery" },
  { label: "Collage", type: "collage" },
];

const editorialBlocks: Array<{ label: string; type: BlockType }> = [
  { label: "CTA", type: "cta" },
  { label: "Subscribe", type: "subscribe" },
  { label: "Share", type: "share" },
  { label: "Insight", type: "insight" },
  { label: "Estadistica", type: "stat" },
  { label: "Pull quote", type: "pullquote" },
  { label: "Highlight", type: "highlight" },
  { label: "Columnas", type: "columns" },
];

function blockId() {
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeType(type: unknown): BlockType {
  const allowed = [...textBlocks, ...mediaBlocks, ...editorialBlocks].map((block) => block.type);
  return allowed.includes(type as BlockType) ? (type as BlockType) : "paragraph";
}

function defaultBlock(type: BlockType): EditorBlock {
  if (type === "divider") return { id: blockId(), type };
  if (type === "image") return { id: blockId(), type, align: "full", caption: "" };
  if (type === "gallery" || type === "collage") return { id: blockId(), type, text: "", caption: "" };
  if (type === "video" || type === "embed") return { id: blockId(), type, url: "", caption: "" };
  if (type === "cta") return { id: blockId(), type, text: "Una invitacion editorial para continuar.", label: "Leer mas", url: "/" };
  if (type === "subscribe") return { id: blockId(), type, text: "Recibe el proximo capitulo de OFF en tu correo." };
  if (type === "share") return { id: blockId(), type, text: "Comparte este capitulo con alguien que necesite leerlo." };
  if (type === "stat") return { id: blockId(), type, value: "70%", label: "de claridad empieza cuando puedes nombrar lo que sientes." };
  if (type === "columns") return { id: blockId(), type, left: "Primera columna editorial.", right: "Segunda columna editorial." };
  if (type === "list" || type === "numbered" || type === "checklist") return { id: blockId(), type, items: "Primer punto\nSegundo punto" };
  return { id: blockId(), type, text: "", align: "left" };
}

function initialBlocks(content?: string): EditorBlock[] {
  if (!content) return [defaultBlock("paragraph")];

  try {
    const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((block) => {
        const type = block.type === "special" ? "insight" : normalizeType(block.type);
        if (type === "list" || type === "numbered" || type === "checklist") {
          return { id: blockId(), type, items: Array.isArray(block.items) ? block.items.join("\n") : "" };
        }
        if (type === "gallery" || type === "collage") {
          const images = Array.isArray(block.images) ? block.images as Array<{ src?: string; caption?: string }> : [];
          return { id: blockId(), type, text: images.map((image) => image.src).filter(Boolean).join("\n"), caption: images.map((image) => image.caption).filter(Boolean).join("\n") };
        }
        if (type === "columns") return { id: blockId(), type, left: String(block.left ?? ""), right: String(block.right ?? "") };
        if (type === "stat") return { id: blockId(), type, value: String(block.value ?? ""), label: String(block.label ?? "") };
        if (type === "cta") return { id: blockId(), type, text: String(block.text ?? ""), url: String(block.url ?? "/"), label: String(block.label ?? "Leer mas") };
        if (type === "video" || type === "embed") return { id: blockId(), type, url: String(block.url ?? ""), caption: String(block.caption ?? "") };
        return {
          id: blockId(),
          type,
          text: storedTextToEditorHtml(String(block.text ?? "")),
          src: typeof block.src === "string" ? block.src : undefined,
          alt: String(block.alt ?? ""),
          caption: String(block.caption ?? ""),
          align: typeof block.align === "string" ? block.align as EditorBlock["align"] : "center",
          color: typeof block.color === "string" ? block.color : undefined,
          highlightColor: typeof block.highlightColor === "string" ? block.highlightColor : undefined,
        };
      });
    }
  } catch {
    return content
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((text) => ({ id: blockId(), type: "paragraph", text: storedTextToEditorHtml(text) }));
  }

  return [defaultBlock("paragraph")];
}

function galleryImages(block: EditorBlock) {
  const sources = (block.text ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const captions = (block.caption ?? "").split("\n").map((item) => item.trim());
  return sources.map((src, index) => ({ src, alt: captions[index] || "Imagen editorial", caption: captions[index] || "" }));
}

function autoGrow(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToEditorHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/&lt;u&gt;([^<]+)&lt;\/u&gt;/g, "<u>$1</u>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\n/g, "<br>");
}

function storedTextToEditorHtml(value: string) {
  if (/<(strong|em|u|s|mark|a|br)(\s|>|\/)/i.test(value)) return value;
  return markdownToEditorHtml(value);
}

function editorHtmlToText(value: string) {
  if (typeof window === "undefined") return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  const template = document.createElement("template");
  template.innerHTML = value.replace(/<br\s*\/?>/gi, "\n");
  return template.content.textContent ?? "";
}

function sanitizeEditorHtml(value: string) {
  if (typeof window === "undefined") return value;
  const template = document.createElement("template");
  template.innerHTML = value;

  template.content.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (!inlineTags.includes(tagName as (typeof inlineTags)[number])) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const safeLinkAttribute = tagName === "a" && ["href", "target", "rel"].includes(name);
      if (!safeLinkAttribute) element.removeAttribute(attribute.name);
    });

    if (tagName === "a") {
      const href = element.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href) && !href.startsWith("/") && !href.startsWith("#") && !href.startsWith("mailto:")) {
        element.removeAttribute("href");
      }
      if (element.getAttribute("target") === "_blank") {
        element.setAttribute("rel", "noreferrer");
      }
    }
  });

  return template.innerHTML;
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

function elementFromNode(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

async function uploadEditorFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  const data = await response.json() as { url?: string; error?: string };

  if (!response.ok || !data.url) {
    throw new Error(data.error || "No pudimos subir la imagen.");
  }

  return data.url;
}

function toEditorialJson(blocks: EditorBlock[]) {
  return JSON.stringify(
    blocks
      .filter((block) => block.type === "divider" || block.type === "image" || block.type === "gallery" || block.type === "collage" || block.text?.trim() || block.items?.trim() || block.url?.trim() || block.value?.trim() || block.left?.trim() || block.right?.trim())
      .filter((block) => block.type !== "image" || block.src || block.preview)
      .map((block) => {
        if (block.type === "divider") return { type: "divider" };
        if (block.type === "image") return { type: "image", src: block.src || "", alt: block.alt || block.caption || "Imagen editorial", caption: block.caption || "", align: block.align || "center" };
        if (block.type === "gallery" || block.type === "collage") return { type: block.type, images: galleryImages(block) };
        if (block.type === "list" || block.type === "numbered" || block.type === "checklist") return { type: block.type, items: (block.items ?? "").split("\n").map((item) => item.trim()).filter(Boolean) };
        if (block.type === "video" || block.type === "embed") return { type: block.type, url: block.url || "", caption: block.caption || "" };
        if (block.type === "cta") return { type: "cta", text: sanitizeEditorHtml(block.text || ""), url: block.url || "/", label: block.label || "Leer mas" };
        if (block.type === "subscribe" || block.type === "share") return { type: block.type, text: sanitizeEditorHtml(block.text || "") };
        if (block.type === "insight") return { type: "special", label: "Estrategia", text: sanitizeEditorHtml(block.text || "") };
        if (block.type === "stat") return { type: "stat", value: block.value || "", label: block.label || "" };
        if (block.type === "columns") return { type: "columns", left: sanitizeEditorHtml(block.left || ""), right: sanitizeEditorHtml(block.right || "") };
        if (block.type === "pullquote") return { type: "pullquote", text: sanitizeEditorHtml(block.text || "") };
        return { type: block.type, text: sanitizeEditorHtml(block.text || ""), align: block.align === "left" || block.align === "center" || block.align === "right" ? block.align : undefined, color: block.color, highlightColor: block.highlightColor };
      }),
  );
}

function InlineHtml({ html }: { html?: string }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(html ?? "") }} />;
}

function renderPreview(block: EditorBlock) {
  if (block.type === "divider") return <hr />;
  if (block.type === "image") {
    return (
      <figure className={`preview-image align-${block.align ?? "center"}`}>
        {block.preview || block.src ? <img src={block.preview || block.src} alt={block.alt || "Imagen editorial"} /> : <div className="image-placeholder">Imagen</div>}
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.type === "gallery" || block.type === "collage") {
    return <div className={`preview-gallery ${block.type}`}>{galleryImages(block).map((image) => <img src={image.src} alt={image.alt} key={image.src} />)}</div>;
  }
  if (block.type === "h1") return <h1><InlineHtml html={block.text} /></h1>;
  if (block.type === "h2") return <h2><InlineHtml html={block.text} /></h2>;
  if (block.type === "h3") return <h3><InlineHtml html={block.text} /></h3>;
  if (block.type === "quote" || block.type === "pullquote") return <blockquote><InlineHtml html={block.text} /></blockquote>;
  if (block.type === "highlight") return <p className="preview-highlight"><InlineHtml html={block.text} /></p>;
  if (block.type === "stat") return <aside className="preview-stat"><strong>{block.value}</strong><span>{block.label}</span></aside>;
  if (block.type === "columns") return <div className="preview-columns"><p>{block.left}</p><p>{block.right}</p></div>;
  if (block.type === "list" || block.type === "numbered" || block.type === "checklist") return <p>{block.items}</p>;
  if (block.type === "cta") return <aside className="preview-cta"><p><InlineHtml html={block.text} /></p><span>{block.label}</span></aside>;
  return <p><InlineHtml html={block.text || block.url} /></p>;
}

export function ArticleEditor({ article, articles = [] }: { article?: Article | null; articles?: Article[] }) {
  const [state, formAction, pending] = useActionState(saveArticleAction, initialState);
  const [clientMessage, setClientMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savedId, setSavedId] = useState(article?.id ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const generatedSlug = useMemo(() => slugify(title), [title]);
  const [slug, setSlug] = useState(article?.slug ?? generatedSlug);
  const [cover, setCover] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initialBlocks(article?.content));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localSave, setLocalSave] = useState("Autosave local listo");
  const [activeBlockId, setActiveBlockId] = useState("");
  const [linkModal, setLinkModal] = useState({ open: false, url: "", newTab: true });
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const contentJson = useMemo(() => toEditorialJson(blocks), [blocks]);
  const characterCount = contentJson.length;
  const overLimit = characterCount > LIMIT;
  const viewSlug = state.slug ?? slug;
  const storageKey = `off-editor-${savedId || slug || "new"}`;
  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? blocks[0];

  useEffect(() => {
    if (state.articleId) setSavedId(state.articleId);
    if (state.slug) setSlug(state.slug);
  }, [state.articleId, state.slug]);

  useEffect(() => {
    setLocalSave("Guardando local...");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ title, excerpt, slug, cover, blocks, updatedAt: new Date().toISOString() }));
      setLocalSave("Guardado local");
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [blocks, cover, excerpt, slug, storageKey, title]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>(".document-page textarea").forEach(autoGrow);
    });
  }, [blocks, excerpt]);

  function handleTitle(value: string) {
    setTitle(value);
    if (!article?.slug && !state.slug) setSlug(slugify(value));
  }

  function addBlock(type: BlockType, afterId?: string) {
    setBlocks((current) => {
      const next = defaultBlock(type);
      if (!afterId) return [...current, next];
      const index = current.findIndex((block) => block.id === afterId);
      if (index < 0) return [...current, next];
      return [...current.slice(0, index + 1), next, ...current.slice(index + 1)];
    });
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

  function updateActiveBlock(patch: Partial<EditorBlock>) {
    if (!activeBlock) return;
    updateBlock(activeBlock.id, patch);
  }

  function saveCurrentSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = elementFromNode(container);
    const editable = element?.closest<HTMLElement>("[data-editable-block]");
    if (!editable) return;

    selectionRangeRef.current = range.cloneRange();
    setActiveBlockId(editable.dataset.blockId ?? "");
  }

  function restoreSelection() {
    const range = selectionRangeRef.current;
    if (!range) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function updateBlockFromEditable(editable: HTMLElement) {
    const blockId = editable.dataset.blockId;
    if (!blockId) return;
    updateBlock(blockId, { text: sanitizeEditorHtml(editable.innerHTML) });
    setActiveBlockId(blockId);
  }

  function applyInline(mark: "bold" | "italic" | "underline" | "highlight" | "strike") {
    if (!restoreSelection()) {
      setClientMessage("Selecciona texto dentro del artículo para aplicar formato.");
      return;
    }

    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!selection || !range || selection.isCollapsed) {
      setClientMessage("Selecciona texto dentro del artículo para aplicar formato.");
      return;
    }

    const container = range.commonAncestorContainer;
    const element = elementFromNode(container);
    const editable = element?.closest<HTMLElement>("[data-editable-block]");
    if (!editable) return;

    const tagByMark = {
      bold: "strong",
      italic: "em",
      underline: "u",
      highlight: "mark",
      strike: "s",
    } as const;
    const wrapper = document.createElement(tagByMark[mark]);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection.addRange(nextRange);
    selectionRangeRef.current = nextRange.cloneRange();
    updateBlockFromEditable(editable);
    setClientMessage("");
  }

  function applyLink() {
    if (!restoreSelection()) {
      setClientMessage("Selecciona texto para agregar un enlace.");
      return;
    }
    setLinkModal({ open: true, url: "", newTab: true });
  }

  function confirmLink() {
    if (!linkModal.url.trim() || !restoreSelection()) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!selection || !range || selection.isCollapsed) return;

    const container = range.commonAncestorContainer;
    const element = elementFromNode(container);
    const editable = element?.closest<HTMLElement>("[data-editable-block]");
    if (!editable) return;

    const link = document.createElement("a");
    link.href = linkModal.url.trim();
    if (linkModal.newTab) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    link.appendChild(range.extractContents());
    range.insertNode(link);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(link);
    selection.addRange(nextRange);
    selectionRangeRef.current = nextRange.cloneRange();
    updateBlockFromEditable(editable);
    setLinkModal({ open: false, url: "", newTab: true });
    setClientMessage("");
  }

  function applyBlockType(type: BlockType) {
    if (!activeBlock) return;
    if (type === "list" || type === "numbered" || type === "checklist") {
      updateBlock(activeBlock.id, { type, items: activeBlock.items || editorHtmlToText(activeBlock.text ?? "") });
      return;
    }
    updateBlock(activeBlock.id, { type, text: activeBlock.text || markdownToEditorHtml(activeBlock.items ?? "") });
  }

  function clearInlineFormat() {
    if (!restoreSelection()) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range) return;
    const container = range.commonAncestorContainer;
    const element = elementFromNode(container);
    const editable = element?.closest<HTMLElement>("[data-editable-block]");
    if (!editable) return;
    editable.querySelectorAll("strong, em, u, s, mark, a").forEach((node) => unwrapElement(node as HTMLElement));
    updateBlockFromEditable(editable);
  }

  async function handleInlineImageFile(blockId: string, file?: File) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateBlock(blockId, { preview });
    setUploading(true);
    setClientMessage("Subiendo imagen...");
    try {
      const url = await uploadEditorFile(file);
      updateBlock(blockId, { src: url, preview: url });
      setClientMessage("");
    } catch (error) {
      setClientMessage(error instanceof Error ? error.message : "No pudimos subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverFile(file?: File) {
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploading(true);
    setClientMessage("Subiendo portada...");
    try {
      const url = await uploadEditorFile(file);
      setCover(url);
      setCoverPreview(url);
      setClientMessage("");
    } catch (error) {
      setClientMessage(error instanceof Error ? error.message : "No pudimos subir la portada.");
    } finally {
      setUploading(false);
    }
  }

  function attachCoverFile(file?: File) {
    if (!file) return;
    void handleCoverFile(file);
  }

  function validateSubmit(event: FormEvent<HTMLFormElement>) {
    if (/data:image\/[a-zA-Z]+;base64,/.test(contentJson)) {
      event.preventDefault();
      setClientMessage("El artículo es demasiado pesado. Revisa imágenes insertadas.");
      return;
    }

    if (contentJson.length > 900000) {
      event.preventDefault();
      setClientMessage("El artículo es demasiado pesado. Revisa imágenes insertadas.");
      return;
    }

    if (uploading) {
      event.preventDefault();
      setClientMessage("Espera a que terminen de subir las imágenes.");
    }
  }

  return (
    <form action={formAction} className="magazine-editor premium-editor document-editor-shell" onSubmit={validateSubmit}>
      <input name="id" type="hidden" value={savedId} />
      <input name="content" type="hidden" value={contentJson} />
      <input name="coverImage" type="hidden" value={cover} />

      <header className="editor-topbar premium-editor-topbar document-editor-topbar">
        <div>
          <a className="editor-back-link" href="/admin">←</a>
          <p className="eyebrow">{article ? "Editar articulo" : "Nuevo articulo"}</p>
          <div className="editor-status-row">
            <span>{article?.status ?? "draft"}</span>
            <span>{localSave}</span>
          </div>
        </div>
        <div className="editor-actions">
          <button className="ghost-button" type="button" onClick={() => setPreviewOpen((open) => !open)}>Vista previa</button>
          <button className="ghost-button" type="button">•••</button>
          <button className="ghost-button" disabled={pending || overLimit || uploading} name="publishIntent" type="submit" value="draft">{pending ? "Guardando..." : "Guardar draft"}</button>
          <button className="button" disabled={pending || overLimit || uploading} name="publishIntent" type="submit" value="publish">{pending ? "Publicando..." : uploading ? "Subiendo..." : "Publicar"}</button>
        </div>
      </header>

      {state.message || clientMessage ? (
        <div className={state.ok && !clientMessage ? "editor-notice success" : "editor-notice error"}>
          <span>{clientMessage || state.message}</span>
          {state.ok && state.status === "published" && viewSlug ? <a href={`/off/${viewSlug}`} target="_blank">Ver articulo</a> : null}
        </div>
      ) : null}

      {linkModal.open ? (
        <div className="link-modal-backdrop" role="dialog" aria-modal="true" aria-label="Agregar enlace">
          <div className="link-modal">
            <strong>Agregar enlace</strong>
            <label>
              URL
              <input
                autoFocus
                placeholder="https://..."
                value={linkModal.url}
                onChange={(event) => setLinkModal((current) => ({ ...current, url: event.target.value }))}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={linkModal.newTab}
                onChange={(event) => setLinkModal((current) => ({ ...current, newTab: event.target.checked }))}
              />
              <span>Abrir en nueva pestaña</span>
            </label>
            <div className="link-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setLinkModal({ open: false, url: "", newTab: true })}>Cancelar</button>
              <button type="button" className="button" onClick={confirmLink}>Aplicar</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="document-editor-frame">
        <aside className="document-left-rail">
          <div className="document-rail-head">
            <span>Documentos</span>
            <a href="/admin/new">+</a>
          </div>
          <div className="document-list">
            {articles.length > 0 ? (
              articles.slice(0, 10).map((doc) => (
                <a className={doc.id === savedId ? "document-list-item active" : "document-list-item"} href={`/admin/${doc.id}`} key={doc.id}>
                  <strong>{doc.title || "Sin titulo"}</strong>
                  <span><i />{doc.status}</span>
                </a>
              ))
            ) : (
              <div className="document-list-empty">Aun no hay documentos.</div>
            )}
          </div>
          <a className="new-sheet-button" href="/admin/new">+ Nueva hoja</a>
        </aside>

        <section className="document-workspace">
          <nav className="editor-command-bar doc-toolbar" aria-label="Toolbar editorial">
            <div className="doc-toolbar-group">
              <select
                value={activeBlock?.type ?? "paragraph"}
                onMouseDown={() => saveCurrentSelection()}
                onChange={(event) => applyBlockType(event.target.value as BlockType)}
              >
                <option value="paragraph">Parrafo</option>
                <option value="h1">Titulo</option>
                <option value="h2">Subtitulo</option>
                <option value="h3">H3</option>
                <option value="quote">Cita</option>
                <option value="pullquote">Cita destacada</option>
                <option value="highlight">Highlight</option>
                <option value="code">Codigo</option>
              </select>
              {(["bold", "italic", "underline", "strike", "highlight"] as const).map((mark) => (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyInline(mark)} key={mark}>{mark === "bold" ? "B" : mark === "italic" ? "I" : mark === "underline" ? "U" : mark === "strike" ? "S" : "H"}</button>
              ))}
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={applyLink}>Link</button>
            </div>
            <div className="doc-toolbar-group">
              {["#ffffff", "#cfc8da", "#7b3dff", "#111111"].map((color) => (
                <button className="color-dot" style={{ background: color }} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => updateActiveBlock({ color })} key={color} aria-label={`Color ${color}`} />
              ))}
              {(["left", "center", "right"] as const).map((align) => (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => updateActiveBlock({ align })} key={align}>{align === "left" ? "Izq" : align === "center" ? "Centro" : "Der"}</button>
              ))}
            </div>
            <div className="doc-toolbar-group">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockType("list")}>Bullets</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockType("numbered")}>1.</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockType("quote")}>Quote</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addBlock("divider", activeBlock?.id)}>Divider</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyBlockType("code")}>{"</>"}</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addBlock("image", activeBlock?.id)}>Imagen</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addBlock("embed", activeBlock?.id)}>Embed</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addBlock("cta", activeBlock?.id)}>CTA</button>
            </div>
          </nav>

          <main className="editor-canvas premium-editor-canvas document-page">
            <input className="title-input editor-title-hero document-title" name="title" placeholder="Titulo del articulo" value={title} onChange={(event) => handleTitle(event.target.value)} required />
            <textarea
              className="excerpt-input editor-excerpt-hero document-excerpt"
              name="excerpt"
              placeholder="Escribe un extracto que abra la tension del articulo..."
              value={excerpt}
              onInput={(event) => autoGrow(event.currentTarget)}
              onChange={(event) => setExcerpt(event.target.value)}
              required
            />
            <div className="document-meta-line">
              <span>{article?.status ?? "draft"}</span>
              <span>{characterCount.toLocaleString()} caracteres</span>
              <span>{localSave}</span>
            </div>

            <div className="block-list document-block-list">
              {blocks.map((block) => (
                <section className={`editor-block premium-block doc-block block-${block.type} ${activeBlock?.id === block.id ? "active" : ""}`} key={block.id} onFocus={() => setActiveBlockId(block.id)}>
                <div className="block-controls premium-block-controls doc-block-floating-controls">
                  <select value={block.type} onChange={(event) => updateBlock(block.id, { ...defaultBlock(event.target.value as BlockType), id: block.id })}>
                    {[...textBlocks, ...mediaBlocks, ...editorialBlocks].map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}
                  </select>
                  <button type="button" onClick={() => addBlock("paragraph", block.id)}>+</button>
                  <button type="button" onClick={() => moveBlock(block.id, -1)}>Subir</button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)}>Bajar</button>
                  <button type="button" onClick={() => removeBlock(block.id)}>Eliminar</button>
                </div>

                {block.type === "divider" ? <hr /> : null}

                {block.type === "image" ? (
                  <div className="image-editor visual-media-editor">
                    {block.preview || block.src ? <img src={block.preview || block.src} alt={block.alt || "Imagen"} /> : <div className="image-placeholder">Sube una imagen dentro del articulo</div>}
                    <input type="file" accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleInlineImageFile(block.id, file);
                    }} />
                    <input placeholder="URL de imagen" value={block.src?.startsWith("__UPLOAD__") ? "" : block.src ?? ""} onChange={(event) => updateBlock(block.id, { src: event.target.value })} />
                    <input placeholder="Caption" value={block.caption ?? ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} />
                    <select value={block.align ?? "center"} onChange={(event) => updateBlock(block.id, { align: event.target.value as EditorBlock["align"] })}>
                      <option value="full">Full width image</option>
                      <option value="center">Centrada</option>
                      <option value="left">Izquierda</option>
                      <option value="right">Derecha</option>
                      <option value="image-left">Imagen izquierda</option>
                      <option value="image-right">Imagen derecha</option>
                    </select>
                  </div>
                ) : null}

                {block.type === "gallery" || block.type === "collage" ? (
                  <div className="visual-media-editor">
                    <textarea placeholder="Pega una URL de imagen por linea" value={block.text ?? ""} onChange={(event) => updateBlock(block.id, { text: event.target.value })} />
                    <textarea placeholder="Captions, una por linea" value={block.caption ?? ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} />
                  </div>
                ) : null}

                {block.type === "video" || block.type === "embed" ? (
                  <div className="visual-media-editor">
                    <input placeholder="URL del video o embed" value={block.url ?? ""} onChange={(event) => updateBlock(block.id, { url: event.target.value })} />
                    <input placeholder="Caption" value={block.caption ?? ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} />
                  </div>
                ) : null}

                {block.type === "stat" ? (
                  <div className="stat-editor">
                    <input placeholder="Dato destacado" value={block.value ?? ""} onChange={(event) => updateBlock(block.id, { value: event.target.value })} />
                    <textarea placeholder="Descripcion" value={block.label ?? ""} onChange={(event) => updateBlock(block.id, { label: event.target.value })} />
                  </div>
                ) : null}

                {block.type === "columns" ? (
                  <div className="columns-editor">
                    <textarea value={block.left ?? ""} onChange={(event) => updateBlock(block.id, { left: event.target.value })} />
                    <textarea value={block.right ?? ""} onChange={(event) => updateBlock(block.id, { right: event.target.value })} />
                  </div>
                ) : null}

                {block.type === "cta" ? (
                  <div className="cta-editor">
                    <textarea value={block.text ?? ""} onChange={(event) => updateBlock(block.id, { text: event.target.value })} />
                    <input placeholder="Texto del boton" value={block.label ?? ""} onChange={(event) => updateBlock(block.id, { label: event.target.value })} />
                    <input placeholder="URL" value={block.url ?? ""} onChange={(event) => updateBlock(block.id, { url: event.target.value })} />
                  </div>
                ) : null}

                {block.type !== "divider" && block.type !== "image" && block.type !== "gallery" && block.type !== "collage" && block.type !== "video" && block.type !== "embed" && block.type !== "stat" && block.type !== "columns" && block.type !== "cta" ? (
                  <div
                    className="block-textarea visual-block-textarea wysiwyg-editable"
                    contentEditable
                    data-editable-block
                    data-block-id={block.id}
                    data-placeholder="Escribe aqui..."
                    suppressContentEditableWarning
                    style={{ color: block.color, background: block.highlightColor, textAlign: block.align === "center" || block.align === "right" ? block.align : "left" }}
                    onFocus={() => setActiveBlockId(block.id)}
                    onMouseUp={saveCurrentSelection}
                    onKeyUp={saveCurrentSelection}
                    onInput={(event) => {
                      const html = sanitizeEditorHtml(event.currentTarget.innerHTML);
                      if (block.type === "list" || block.type === "numbered" || block.type === "checklist") {
                        updateBlock(block.id, { items: event.currentTarget.innerText });
                      } else {
                        updateBlock(block.id, { text: html });
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: block.type === "list" || block.type === "numbered" || block.type === "checklist" ? markdownToEditorHtml(block.items ?? "") : block.text ?? "" }}
                  />
                ) : null}
              </section>
              ))}
            </div>
          </main>
        </section>

        <aside className="editor-sidebar premium-editor-sidebar document-right-rail">
          <div className="settings-tabs"><span className="active">Contenido</span><span>Diseño</span></div>
          <div className="right-panel-group">
            <strong>Portada</strong>
            <label
              className={coverPreview ? "cover-dropzone mini-cover-dropzone has-cover" : "cover-dropzone mini-cover-dropzone"}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                attachCoverFile(event.dataTransfer.files?.[0]);
              }}
            >
              {coverPreview ? <img src={coverPreview} alt="Preview portada" /> : <span>Subir imagen</span>}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={(event) => void handleCoverFile(event.target.files?.[0])} />
            </label>
            <input value={cover} placeholder="Ruta de portada" onChange={(event) => { setCover(event.target.value); setCoverPreview(event.target.value); }} />
            <button type="button" onClick={() => { setCover(""); setCoverPreview(""); }}>Quitar portada</button>
          </div>
          <div className="right-panel-group">
            <label className="field">Estado<select name="status" defaultValue={article?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
            <label className="field">Categoria<input name="category" defaultValue={article?.category ?? "Vida"} required /></label>
            <label className="field">Slug<input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required /></label>
            <label className="field">Tiempo estimado<input name="readTime" defaultValue={article?.readTime ?? "5 min leer"} required /></label>
            <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={article?.featured ?? false} /><span>Destacado</span></label>
            <div className={overLimit ? "character-count over" : "character-count"}>{characterCount.toLocaleString()} / {LIMIT.toLocaleString()} caracteres</div>
          </div>
        </aside>
      </div>

      {previewOpen ? (
        <section className="editor-preview premium-live-preview">
          <p className="eyebrow">Vista previa</p>
          <h1>{title || "Titulo del articulo"}</h1>
          <p className="preview-excerpt">{excerpt || "Extracto editorial"}</p>
          {blocks.map((block) => <div key={block.id}>{renderPreview(block)}</div>)}
        </section>
      ) : null}
    </form>
  );
}
