"use client";

import type { Article } from "@prisma/client";
import { Extension } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { autosaveArticleAction, deleteArticleAction, logoutAction, saveArticleAction, type AutosaveArticlePayload, type SaveArticleState } from "@/app/actions";
import { slugify } from "@/lib/slug";

const LIMIT = 70000;
const initialState: SaveArticleState = { ok: false, message: "" };
const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const EditorialImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-layout") || "center",
        renderHTML: (attributes) => ({ "data-layout": attributes.layout }),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width};` };
        },
      },
    };
  },
});

type LegacyBlock = {
  type?: string;
  text?: string;
  items?: string[];
  src?: string;
  alt?: string;
  caption?: string;
  align?: string;
  url?: string;
  label?: string;
  value?: string;
  left?: string;
  right?: string;
  images?: Array<{ src?: string; alt?: string; caption?: string }>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/&lt;u&gt;([^<]+)&lt;\/u&gt;/g, "<u>$1</u>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\n/g, "<br>");
}

function inlineToHtml(value = "") {
  if (/<(strong|em|u|s|mark|a|br|span)(\s|>|\/)/i.test(value)) return value;
  return markdownToHtml(value);
}

function legacyContentToHtml(content?: string) {
  if (!content) return "<p></p>";

  try {
    const parsed = JSON.parse(content) as LegacyBlock[];
    if (!Array.isArray(parsed)) return `<p>${inlineToHtml(content)}</p>`;

    const html = parsed.map((block) => {
      const text = inlineToHtml(block.text ?? "");

      if (block.type === "h1") return `<h1>${text}</h1>`;
      if (block.type === "h2") return `<h2>${text}</h2>`;
      if (block.type === "h3") return `<h3>${text}</h3>`;
      if (block.type === "quote" || block.type === "pullquote") return `<blockquote>${text}</blockquote>`;
      if (block.type === "highlight") return `<p><mark>${text}</mark></p>`;
      if (block.type === "code") return `<pre><code>${escapeHtml(block.text ?? "")}</code></pre>`;
      if (block.type === "divider") return "<hr>";
      if (block.type === "list" || block.type === "checklist") {
        return `<ul>${(block.items ?? []).map((item) => `<li>${inlineToHtml(item)}</li>`).join("")}</ul>`;
      }
      if (block.type === "numbered") {
        return `<ol>${(block.items ?? []).map((item) => `<li>${inlineToHtml(item)}</li>`).join("")}</ol>`;
      }
      if (block.type === "image" && block.src) {
        return `<figure><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? block.caption ?? "Imagen editorial")}">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
      }
      if ((block.type === "gallery" || block.type === "collage") && block.images?.length) {
        return block.images.map((image) => image.src ? `<figure><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt ?? "Imagen editorial")}">${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>` : "").join("");
      }
      if ((block.type === "video" || block.type === "embed") && block.url) {
        return `<p><a href="${escapeHtml(block.url)}">${escapeHtml(block.url)}</a></p>`;
      }
      if (block.type === "cta") return `<blockquote>${text}</blockquote>`;
      if (block.type === "stat") return `<blockquote><strong>${escapeHtml(block.value ?? "")}</strong><br>${escapeHtml(block.label ?? "")}</blockquote>`;
      if (block.type === "columns") return `<p>${inlineToHtml(block.left ?? "")}</p><p>${inlineToHtml(block.right ?? "")}</p>`;
      if (block.type === "special") return `<blockquote>${text}</blockquote>`;

      return `<p>${text}</p>`;
    }).join("");

    return html || "<p></p>";
  } catch {
    return content
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((paragraph) => `<p>${inlineToHtml(paragraph)}</p>`)
      .join("");
  }
}

function sanitizeInlineHtml(value: string) {
  const template = document.createElement("template");
  template.innerHTML = value;

  template.content.querySelectorAll("*").forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!["strong", "em", "u", "s", "mark", "a", "br", "span"].includes(tag)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const safeLinkAttribute = tag === "a" && ["href", "target", "rel"].includes(name);
      const safeStyleAttribute = ["span", "mark"].includes(tag) && name === "style" && !/url|expression|javascript/i.test(attribute.value);
      if (!safeLinkAttribute && !safeStyleAttribute) {
        element.removeAttribute(attribute.name);
      }
    });

    if (tag === "a") {
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

function htmlToText(value: string) {
  const template = document.createElement("template");
  template.innerHTML = value.replace(/<br\s*\/?>/gi, "\n");
  return template.content.textContent ?? "";
}

function htmlToEditorialJson(html: string) {
  if (typeof document === "undefined") return "[]";

  const template = document.createElement("template");
  template.innerHTML = html;
  const blocks: Array<Record<string, unknown>> = [];

  function pushTextBlock(type: string, element: Element) {
    const text = sanitizeInlineHtml(element.innerHTML);
    if (htmlToText(text).trim()) blocks.push({ type, text });
  }

  template.content.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: "paragraph", text: escapeHtml(text) });
      return;
    }

    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();

    if (tag === "p") pushTextBlock("paragraph", node);
    else if (tag === "h1") pushTextBlock("h1", node);
    else if (tag === "h2") pushTextBlock("h2", node);
    else if (tag === "h3") pushTextBlock("h3", node);
    else if (tag === "blockquote") pushTextBlock("quote", node);
    else if (tag === "pre") blocks.push({ type: "code", text: node.textContent ?? "" });
    else if (tag === "hr") blocks.push({ type: "divider" });
    else if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll("li")).map((item) => sanitizeInlineHtml(item.innerHTML)).filter((item) => htmlToText(item).trim());
      blocks.push({ type: tag === "ol" ? "numbered" : "list", items });
    } else if (tag === "img") {
      const src = node.getAttribute("src") ?? "";
      if (src) blocks.push({ type: "image", src, alt: node.getAttribute("alt") ?? "Imagen editorial", align: node.getAttribute("data-layout") ?? "center", width: node.getAttribute("style") ?? undefined });
    } else if (tag === "figure") {
      const image = node.querySelector("img");
      const src = image?.getAttribute("src") ?? "";
      if (src) {
        blocks.push({
          type: "image",
          src,
          alt: image?.getAttribute("alt") ?? "Imagen editorial",
          caption: node.querySelector("figcaption")?.textContent ?? "",
          align: image?.getAttribute("data-layout") ?? "center",
          width: image?.getAttribute("style") ?? undefined,
        });
      }
    } else {
      pushTextBlock("paragraph", node);
    }
  });

  return JSON.stringify(blocks.length ? blocks : [{ type: "paragraph", text: "" }]);
}

function safePreviewHtml(html: string) {
  if (typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on")) element.removeAttribute(attribute.name);
      if (attribute.name.toLowerCase() === "href" && attribute.value.toLowerCase().startsWith("javascript:")) element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

async function uploadEditorFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  let data: { url?: string; error?: string };
  try {
    data = await response.json() as { url?: string; error?: string };
  } catch {
    throw new Error("No se pudo subir la imagen. Intenta con otro archivo.");
  }

  if (!response.ok || !data.url) {
    throw new Error(data.error || "No se pudo subir la imagen. Intenta con otro archivo.");
  }

  return data.url;
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
  const [statusValue, setStatusValue] = useState(article?.status ?? "draft");
  const [category, setCategory] = useState(article?.category ?? "Vida");
  const [readTime, setReadTime] = useState(article?.readTime ?? "5 min leer");
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const initialEditorContent = useMemo(() => legacyContentToHtml(article?.content), [article?.content]);
  const [editorHtml, setEditorHtml] = useState(initialEditorContent);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localSave, setLocalSave] = useState("Autosave local listo");
  const [serverSave, setServerSave] = useState("Guardado");
  const [linkModal, setLinkModal] = useState({ open: false, title: "", url: "", newTab: true });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hexColor, setHexColor] = useState("#7B3DFF");
  const [activePanel, setActivePanel] = useState<"content" | "design">("content");
  const [selectedKind, setSelectedKind] = useState<"text" | "image" | null>(null);
  const [lastSelectedImage, setLastSelectedImage] = useState("");
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      EditorialImage.configure({ allowBase64: false, inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noreferrer" },
      }),
      Placeholder.configure({ placeholder: "Empieza a escribir..." }),
    ],
    content: initialEditorContent,
    onUpdate: ({ editor: currentEditor }) => setEditorHtml(currentEditor.getHTML()),
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const image = currentEditor.getAttributes("image").src as string | undefined;
      if (image) {
        setSelectedKind("image");
        setLastSelectedImage(image);
      } else if (!currentEditor.state.selection.empty) {
        setSelectedKind("text");
      } else {
        setSelectedKind(null);
      }
    },
  });

  const contentJson = useMemo(() => htmlToEditorialJson(editorHtml), [editorHtml]);
  const characterCount = useMemo(() => htmlToText(editorHtml).length, [editorHtml]);
  const overLimit = characterCount > LIMIT;
  const viewSlug = state.slug ?? slug;
  const storageKey = `off-editor-${savedId || slug || "new"}`;

  useEffect(() => {
    if (state.articleId) setSavedId(state.articleId);
    if (state.slug) setSlug(state.slug);
    if (state.status) setStatusValue(state.status);
  }, [state.articleId, state.slug, state.status]);

  useEffect(() => {
    setLocalSave("Guardando local...");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ title, excerpt, slug, cover, editorHtml, updatedAt: new Date().toISOString() }));
      setLocalSave("Guardado local");
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [cover, editorHtml, excerpt, slug, storageKey, title]);

  useEffect(() => {
    const readableText = htmlToText(editorHtml).trim();
    if (!title.trim() && !excerpt.trim() && !readableText) return;
    if (overLimit || uploading) return;

    setServerSave("Guardando...");
    const timeout = window.setTimeout(async () => {
      const payload: AutosaveArticlePayload = {
        id: savedId,
        title,
        slug: slug || slugify(title),
        excerpt,
        content: contentJson,
        coverImage: cover,
        category,
        readTime,
        status: statusValue === "published" ? "published" : "draft",
        featured,
      };
      const result = await autosaveArticleAction(payload);
      if (result.ok) {
        if (result.articleId) setSavedId(result.articleId);
        if (result.slug) setSlug(result.slug);
        setServerSave("Guardado");
      } else {
        setServerSave("Error al guardar");
      }
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [category, contentJson, cover, editorHtml, excerpt, featured, overLimit, readTime, savedId, slug, statusValue, title, uploading]);

  function handleTitle(value: string) {
    setTitle(value);
    if (!slug.trim() || (!article?.slug && !state.slug)) setSlug(slugify(value));
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
      setClientMessage(error instanceof Error ? error.message : "No se pudo subir la imagen. Intenta con otro archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInlineImageFile(file?: File) {
    if (!file || !editor) return;
    setUploading(true);
    setClientMessage("Subiendo imagen...");
    try {
      const url = await uploadEditorFile(file);
      editor.chain().focus().setImage({ src: url, alt: "Imagen editorial" }).run();
      setEditorHtml(editor.getHTML());
      setClientMessage("");
    } catch (error) {
      setClientMessage(error instanceof Error ? error.message : "No se pudo subir la imagen. Intenta con otro archivo.");
    } finally {
      setUploading(false);
    }
  }

  function validateSubmit(event: FormEvent<HTMLFormElement>) {
    if (/data:image\/[a-zA-Z]+;base64,/.test(contentJson)) {
      event.preventDefault();
      setClientMessage("El articulo es demasiado pesado. Revisa imagenes insertadas.");
      return;
    }

    if (contentJson.length > 900000) {
      event.preventDefault();
      setClientMessage("El articulo es demasiado pesado. Revisa imagenes insertadas.");
      return;
    }

    if (uploading) {
      event.preventDefault();
      setClientMessage("Espera a que terminen de subir las imagenes.");
    }
  }

  function applyLink() {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href as string | undefined;
    const { from, to } = editor.state.selection;
    const selectedTitle = editor.state.doc.textBetween(from, to, " ").trim();
    setLinkModal({ open: true, title: selectedTitle, url: currentHref ?? "", newTab: true });
  }

  function confirmLink() {
    if (!editor) return;
    const url = linkModal.url.trim();
    const title = linkModal.title.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModal({ open: false, title: "", url: "", newTab: true });
      return;
    }

    if (title) {
      editor.chain().focus().insertContent(`<a href="${escapeHtml(url)}" target="${linkModal.newTab ? "_blank" : ""}">${escapeHtml(title)}</a>`).run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url, target: linkModal.newTab ? "_blank" : null })
        .run();
    }
    setEditorHtml(editor.getHTML());
    setLinkModal({ open: false, title: "", url: "", newTab: true });
  }

  function applyColor(color: string) {
    if (!editor || !HEX_PATTERN.test(color)) {
      setClientMessage("Escribe un color HEX valido, por ejemplo #7B3DFF.");
      return;
    }
    editor.chain().focus().setColor(color).run();
    setEditorHtml(editor.getHTML());
    setHexColor(color.toUpperCase());
    setPaletteOpen(false);
    setClientMessage("");
  }

  function applyFontSize(size: string) {
    if (!editor) return;
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    setEditorHtml(editor.getHTML());
  }

  function applyImageLayout(layout: "center" | "left" | "right" | "full") {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { layout }).run();
    setEditorHtml(editor.getHTML());
  }

  function applyImageWidth(width: string) {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { width }).run();
    setEditorHtml(editor.getHTML());
  }

  const canUseToolbar = Boolean(editor);

  return (
    <form action={formAction} className="magazine-editor premium-editor document-editor-shell" onSubmit={validateSubmit}>
      <input name="id" type="hidden" value={savedId} />
      <input name="content" type="hidden" value={contentJson} />
      <input name="coverImage" type="hidden" value={cover} />
      <input name="status" type="hidden" value={statusValue} />
      <input name="category" type="hidden" value={category} />
      <input name="readTime" type="hidden" value={readTime} />
      {featured ? <input name="featured" type="hidden" value="on" /> : null}

      <header className="editor-topbar premium-editor-topbar document-editor-topbar">
        <div>
          <a className="editor-back-link" href="/admin">â†</a>
          <p className="eyebrow">{article ? "Editar articulo" : "Nuevo articulo"}</p>
          <div className="editor-status-row">
            <span>{article?.status ?? "draft"}</span>
            <span>{localSave}</span>
          </div>
        </div>
        <div className="editor-actions">
          <button className="ghost-button" type="button" onClick={() => setPreviewOpen((open) => !open)}>Vista previa</button>
          <button className="ghost-button" formAction={logoutAction} formNoValidate type="submit">Cerrar sesion</button>
          {savedId ? (
            <button
              className="delete-button compact"
              formAction={deleteArticleAction}
              formNoValidate
              type="submit"
              onClick={(event) => {
                const confirmed = window.confirm("Seguro que quieres eliminar este articulo? Esta accion no se puede deshacer.");
                if (!confirmed) event.preventDefault();
              }}
            >
              Eliminar
            </button>
          ) : null}
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
              Titulo del enlace
              <input placeholder="Texto visible del enlace" value={linkModal.title} onChange={(event) => setLinkModal((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              URL
              <input autoFocus placeholder="https://..." value={linkModal.url} onChange={(event) => setLinkModal((current) => ({ ...current, url: event.target.value }))} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={linkModal.newTab} onChange={(event) => setLinkModal((current) => ({ ...current, newTab: event.target.checked }))} />
              <span>Abrir en nueva pestaÃ±a</span>
            </label>
            <div className="link-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setLinkModal({ open: false, title: "", url: "", newTab: true })}>Cancelar</button>
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
              <>
                <span className="document-section-label">Publicados</span>
                {articles.filter((doc) => doc.status === "published").slice(0, 8).map((doc) => (
                  <a className={doc.id === savedId ? "document-list-item active" : "document-list-item"} href={`/admin/${doc.id}`} key={doc.id}>
                    <strong>{doc.title || "Sin titulo"}</strong>
                    <span><i />Publicado</span>
                  </a>
                ))}
                <span className="document-section-label">Borradores</span>
                {articles.filter((doc) => doc.status !== "published").slice(0, 12).map((doc) => (
                  <a className={doc.id === savedId ? "document-list-item active" : "document-list-item"} href={`/admin/${doc.id}`} key={doc.id}>
                    <strong>{doc.title || "Sin titulo"}</strong>
                    <span><i />Borrador</span>
                  </a>
                ))}
                {articles.every((doc) => doc.status === "published") ? <div className="document-list-empty">Sin borradores.</div> : null}
              </>
            ) : (
              <div className="document-list-empty">Aun no hay documentos.</div>
            )}
          </div>
          <a className="new-sheet-button" href="/admin/new">+ Nueva hoja</a>
        </aside>

        <section className="document-workspace">
          <nav className="editor-command-bar doc-toolbar tiptap-toolbar" aria-label="Toolbar editorial">
            <div className="doc-toolbar-group">
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().setParagraph().run()}>Parrafo</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</button>
            </div>
            <div className="doc-toolbar-group">
              <button type="button" className={editor?.isActive("bold") ? "active" : ""} disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
              <button type="button" className={editor?.isActive("italic") ? "active" : ""} disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
              <button type="button" className={editor?.isActive("underline") ? "active" : ""} disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
              <button type="button" className={editor?.isActive("strike") ? "active" : ""} disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleStrike().run()}>S</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleHighlight({ color: "#7b3dff55" }).run()}>Highlight</button>
              <button type="button" disabled={!canUseToolbar} onClick={applyLink}>Link</button>
            </div>
            <div className="doc-toolbar-group">
              <div className="palette-wrap">
                <button type="button" disabled={!canUseToolbar} onClick={() => setPaletteOpen((open) => !open)}>Paleta</button>
                {paletteOpen ? (
                  <div className="palette-popover">
                    <span>Colores OFF</span>
                    <div className="palette-swatches">
                      {["#FFFFFF", "#CFC8DA", "#7B3DFF", "#A78BFA", "#111111"].map((color) => (
                        <button className="color-dot" style={{ background: color }} type="button" onClick={() => applyColor(color)} key={color} aria-label={`Color ${color}`} />
                      ))}
                    </div>
                    <label>
                      Selector
                      <input type="color" value={HEX_PATTERN.test(hexColor) ? hexColor : "#7B3DFF"} onChange={(event) => applyColor(event.target.value)} />
                    </label>
                    <label>
                      HEX exacto
                      <input value={hexColor} onChange={(event) => setHexColor(event.target.value)} placeholder="#7B3DFF" />
                    </label>
                    <button type="button" onClick={() => applyColor(hexColor)}>Aplicar HEX</button>
                  </div>
                ) : null}
              </div>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>Divider</button>
              <button type="button" disabled={!canUseToolbar || uploading} onClick={() => imageInputRef.current?.click()}>Imagen</button>
              <input ref={imageInputRef} hidden type="file" accept="image/*" onChange={(event) => void handleInlineImageFile(event.target.files?.[0])} />
            </div>
          </nav>

          <main className="editor-canvas premium-editor-canvas document-page tiptap-page">
            <input className="title-input editor-title-hero document-title" name="title" placeholder="Titulo del articulo" value={title} onChange={(event) => handleTitle(event.target.value)} required />
            <textarea
              className="excerpt-input editor-excerpt-hero document-excerpt"
              name="excerpt"
              placeholder="Escribe un extracto que abra la tension del articulo..."
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              required
            />
            <div className="document-meta-line">
              <span>{article?.status ?? "draft"}</span>
              <span>{characterCount.toLocaleString()} caracteres</span>
              <span>{localSave}</span>
            </div>
            <EditorContent editor={editor} className="tiptap-editor" />
          </main>
        </section>

        <aside className="editor-sidebar premium-editor-sidebar document-right-rail">
          <div className="settings-tabs">
            <button className={activePanel === "content" ? "active" : ""} type="button" onClick={() => setActivePanel("content")}>Contenido</button>
            <button className={activePanel === "design" ? "active" : ""} type="button" onClick={() => setActivePanel("design")}>Diseño</button>
          </div>

          {activePanel === "content" ? (
            <>
              <div className="right-panel-group">
                <strong>Portada</strong>
                <label
                  className={coverPreview ? "cover-dropzone mini-cover-dropzone has-cover" : "cover-dropzone mini-cover-dropzone"}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleCoverFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  {coverPreview ? <img src={coverPreview} alt="Preview portada" /> : <span>Subir imagen</span>}
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={(event) => void handleCoverFile(event.target.files?.[0])} />
                </label>
                <input value={cover} placeholder="Ruta de portada" onChange={(event) => { setCover(event.target.value); setCoverPreview(event.target.value); }} />
                <button type="button" onClick={() => { setCover(""); setCoverPreview(""); }}>Quitar portada</button>
              </div>
              <div className="right-panel-group">
                <label className="field">Estado<select name="status" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                <label className="field">Categoria<input name="category" value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
                <label className="field">Slug<input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required /></label>
                <label className="field">Tiempo estimado<input name="readTime" value={readTime} onChange={(event) => setReadTime(event.target.value)} required /></label>
                <label className="checkbox"><input name="featured" type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /><span>Destacado</span></label>
                <div className={overLimit ? "character-count over" : "character-count"}>{characterCount.toLocaleString()} / {LIMIT.toLocaleString()} caracteres</div>
                <div className="autosave-state">{serverSave}</div>
              </div>
            </>
          ) : (
            <div className="right-panel-group design-panel">
              <strong>Diseño del bloque</strong>
              {!selectedKind ? <p className="empty-dashboard-state">Selecciona texto o una imagen para modificar su diseño.</p> : null}
              <label className="field">Estilo de texto
                <select onChange={(event) => {
                  const value = event.target.value;
                  if (value === "paragraph") editor?.chain().focus().setParagraph().run();
                  if (value === "title") editor?.chain().focus().toggleHeading({ level: 1 }).run();
                  if (value === "subtitle" || value === "h2") editor?.chain().focus().toggleHeading({ level: 2 }).run();
                  if (value === "h3") editor?.chain().focus().toggleHeading({ level: 3 }).run();
                  if (value === "quote") editor?.chain().focus().toggleBlockquote().run();
                }} defaultValue="paragraph">
                  <option value="paragraph">Parrafo</option>
                  <option value="title">Titulo</option>
                  <option value="subtitle">Subtitulo</option>
                  <option value="h2">H2</option>
                  <option value="h3">H3</option>
                  <option value="quote">Cita</option>
                </select>
              </label>
              <label className="field">Tamaño de texto
                <select onChange={(event) => applyFontSize(event.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar</option>
                  <option value="14px">Pequeño</option>
                  <option value="18px">Normal</option>
                  <option value="24px">Grande</option>
                  <option value="36px">Extra grande</option>
                </select>
              </label>
              <label className="field">Tamaño personalizado<input placeholder="Ej. 22px" onBlur={(event) => event.target.value && applyFontSize(event.target.value)} /></label>
              <label className="field">Color de texto<input value={hexColor} onChange={(event) => setHexColor(event.target.value)} onBlur={() => applyColor(hexColor)} placeholder="#7B3DFF" /></label>
              <div className="design-button-row">
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>Izquierda</button>
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>Centro</button>
                <button type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>Derecha</button>
              </div>
              <label className="field">Espaciado opcional<input placeholder="Usa Enter para separar bloques" disabled /></label>
              {selectedKind === "image" || lastSelectedImage ? (
                <>
                  <label className="field">Ancho de imagen<input placeholder="100%, 720px..." onBlur={(event) => event.target.value && applyImageWidth(event.target.value)} /></label>
                  <div className="design-button-row">
                    <button type="button" onClick={() => applyImageLayout("center")}>Centrada</button>
                    <button type="button" onClick={() => applyImageLayout("left")}>Izquierda</button>
                    <button type="button" onClick={() => applyImageLayout("right")}>Derecha</button>
                    <button type="button" onClick={() => applyImageLayout("full")}>Full width</button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {previewOpen ? (
        <div className="preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del articulo">
          <section className="editor-preview premium-live-preview preview-modal">
            <button className="ghost-button preview-close" type="button" onClick={() => setPreviewOpen(false)}>Cerrar</button>
            {coverPreview ? <img className="preview-cover" src={coverPreview} alt="" /> : null}
            <p className="eyebrow">Vista previa</p>
            <h1>{title || "Titulo del articulo"}</h1>
            <p className="preview-excerpt">{excerpt || "Extracto editorial"}</p>
            <div className="reader" dangerouslySetInnerHTML={{ __html: safePreviewHtml(editorHtml) }} />
          </section>
        </div>
      ) : null}
    </form>
  );
}

