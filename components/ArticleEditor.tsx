"use client";

import type { Article } from "@prisma/client";
import { Extension, Node as TiptapNode, type Editor as TiptapEditor } from "@tiptap/core";
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
import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { autosaveArticleAction, deleteArticleAction, logoutAction, saveArticleAction, type AutosaveArticlePayload, type SaveArticleState } from "@/app/actions";
import { AdminSessionGuard } from "@/components/AdminSessionGuard";
import { slugify } from "@/lib/slug";

const LIMIT = 70000;
const initialState: SaveArticleState = { ok: false, message: "" };
const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EDITOR_CATEGORIES = ["Negocios", "Vida", "Sociedad", "Tips", "Crecimiento"];
const PALETTE_COLORS = [
  "#FFFFFF", "#F5F1FF", "#D8D1E6", "#A7A1B3", "#6F687A",
  "#000000", "#07060A", "#111116", "#1B1723", "#2A2237",
  "#7B3DFF", "#8B5CF6", "#A78BFA", "#5B2CCF", "#241142",
  "#1ED760", "#E7C66A", "#E86D6D", "#64D2FF", "#FF8BD1",
];
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-m4v,video/x-matroska,video/x-ms-wmv,.mp4,.mov,.mkv,.wmv,.webm";
const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/tiff,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.svg";
const IMAGE_MAX_SIZE = 25 * 1024 * 1024;
const VIDEO_MAX_SIZE = 150 * 1024 * 1024;
const ZOOM_LEVELS = [75, 100, 125, 150];
const PAGE_SIZES = {
  a4: { label: "A4", width: 794, minHeight: 1123 },
  letter: { label: "Carta", width: 816, minHeight: 1056 },
  magazineVertical: { label: "Revista vertical", width: 820, minHeight: 1160 },
  magazineHorizontal: { label: "Revista horizontal", width: 1080, minHeight: 760 },
  custom: { label: "Custom", width: 920, minHeight: 1040 },
} as const;
const EDITOR_FONTS = [
  { label: "JA Jayagiri Sans", family: '"JA Jayagiri Sans", "Open Sans", sans-serif' },
  { label: "Open Sans", family: '"Open Sans", Arial, sans-serif' },
  { label: "Poppins", family: 'Poppins, Arial, sans-serif' },
  { label: "Arial", family: 'Arial, sans-serif' },
  { label: "Anton", family: 'Anton, "Arial Black", sans-serif' },
  { label: "League Spartan", family: '"League Spartan", Poppins, sans-serif' },
  { label: "Archivo Black", family: '"Archivo Black", "Arial Black", sans-serif' },
  { label: "Fenway Banner Variable", family: '"fenway-banner-vf", sans-serif', variation: '"wght" 300, "wdth" 100' },
  { label: "PD Monolina", family: '"PD Monolina", "Cormorant Garamond", serif' },
  { label: "Hardcover Variable", family: '"hardcover-variable", "Playfair Display", serif' },
  { label: "Late Serif Variable", family: '"late-serif-variable", "Libre Baskerville", serif' },
  { label: "Eanne Moderno OT BoldItalic", family: '"Eanne Moderno OT BoldItalic", "DM Serif Display", serif' },
  { label: "Design Foundations", family: '"Design Foundations", Inter, sans-serif' },
  { label: "Playfair Display", family: '"Playfair Display", Georgia, serif' },
  { label: "Cormorant Garamond", family: '"Cormorant Garamond", Georgia, serif' },
  { label: "Libre Baskerville", family: '"Libre Baskerville", Georgia, serif' },
  { label: "DM Serif Display", family: '"DM Serif Display", Georgia, serif' },
  { label: "Inter", family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: "Manrope", family: 'Manrope, Inter, sans-serif' },
  { label: "Montserrat", family: 'Montserrat, Inter, sans-serif' },
  { label: "Lora", family: 'Lora, Georgia, serif' },
  { label: "Merriweather", family: 'Merriweather, Georgia, serif' },
  { label: "Space Grotesk", family: '"Space Grotesk", Inter, sans-serif' },
  { label: "Bebas Neue", family: '"Bebas Neue", Impact, sans-serif' },
  { label: "Oswald", family: 'Oswald, Arial, sans-serif' },
];

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
              const styles = [];
              if (attributes.fontSize) styles.push(`font-size: ${attributes.fontSize}`);
              if (attributes.lineHeight) styles.push(`line-height: ${attributes.lineHeight}`);
              if (attributes.fontFamily) styles.push(`font-family: ${attributes.fontFamily}`);
              if (attributes.fontVariationSettings) styles.push(`font-variation-settings: ${attributes.fontVariationSettings}`);
              if (styles.length === 0) return {};
              return { style: styles.join("; ") };
            },
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight.replace(/['"]+/g, ""),
          },
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily,
          },
          fontVariationSettings: {
            default: null,
            parseHTML: (element) => element.style.fontVariationSettings,
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

const VideoEmbed = TiptapNode.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      size: { default: "medium" },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", { ...HTMLAttributes, "data-size": HTMLAttributes.size || "medium", controls: "true" }];
  },
});

const SpotifyEmbed = TiptapNode.create({
  name: "spotifyEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      url: { default: null },
      title: { default: "Contenido de Spotify" },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-spotify-card]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      { class: "spotify-pill", href: HTMLAttributes.url, "data-spotify-card": "true", "data-title": HTMLAttributes.title || "Contenido de Spotify", target: "_blank", rel: "noreferrer" },
      ["span", { class: "spotify-pill-logo", "aria-hidden": "true" }],
      ["span", { class: "spotify-pill-title" }, HTMLAttributes.title || "Contenido de Spotify"],
    ];
  },
});

function editorExtensions(placeholder: string) {
  return [
    StarterKit,
    Underline,
    TextStyle,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    EditorialImage.configure({ allowBase64: false, inline: false }),
    VideoEmbed,
    SpotifyEmbed,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: "noreferrer" },
    }),
    Placeholder.configure({ placeholder }),
  ];
}

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
      if (block.type === "video" && block.url) {
        return `<video src="${escapeHtml(block.url)}" controls></video>`;
      }
      if (block.type === "embed" && block.url) {
        if (block.caption === "spotify") {
          return `<a class="spotify-pill" data-spotify-card="true" href="${escapeHtml(block.url)}" data-title="${escapeHtml(block.label ?? "Contenido de Spotify")}"><span class="spotify-pill-logo" aria-hidden="true"></span><span class="spotify-pill-title">${escapeHtml(block.label ?? "Contenido de Spotify")}</span></a>`;
        }
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

function isVideoFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return file.type.startsWith("video/") || ["mp4", "mov", "mkv", "wmv", "webm"].includes(extension ?? "");
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

    const spotifyCard = node.matches("a[data-spotify-card]") ? node : node.querySelector("a[data-spotify-card]");
    if (spotifyCard) {
      const url = spotifyCard.getAttribute("href") ?? "";
      if (url) blocks.push({ type: "embed", url, caption: "spotify", label: spotifyCard.getAttribute("data-title") ?? spotifyCard.textContent ?? "Contenido de Spotify" });
      return;
    }

    const imageElement = node.matches("img") ? node : node.querySelector("img");
    if (imageElement) {
      const src = imageElement.getAttribute("src") ?? "";
      if (src) {
        blocks.push({
          type: "image",
          src,
          alt: imageElement.getAttribute("alt") ?? "Imagen editorial",
          caption: node.querySelector("figcaption")?.textContent ?? "",
          align: imageElement.getAttribute("data-layout") ?? "center",
          width: imageElement.getAttribute("style") ?? undefined,
        });
      }
      return;
    }

    const videoElement = node.matches("video") ? node : node.querySelector("video");
    if (videoElement) {
      const src = videoElement.getAttribute("src") ?? "";
      if (src) blocks.push({ type: "video", url: src, caption: videoElement.getAttribute("data-caption") ?? "", label: videoElement.getAttribute("data-size") ?? "medium" });
      return;
    }

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
  const kind = isVideoFile(file) ? "video" : "image";
  const maxSize = kind === "video" ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
  if (file.size > maxSize) {
    throw new Error("El archivo supera el tamaño permitido.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  let data: { success?: boolean; url?: string; error?: string };
  try {
    data = await response.json() as { success?: boolean; url?: string; error?: string };
  } catch {
    throw new Error("No se pudo subir el archivo. Revisa formato o tamaño.");
  }

  if (!response.ok || !data.success || !data.url) {
    throw new Error(data.error || "No se pudo subir el archivo. Revisa formato o tamaño.");
  }

  return data.url;
}

function insertMediaNode(editor: TiptapEditor, type: "image" | "videoEmbed", attrs: Record<string, unknown>, range?: { from: number; to: number } | null) {
  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const nodeType = editor.schema.nodes[type];
      if (!nodeType) return false;

      const docSize = tr.doc.content.size;
      const from = Math.min(Math.max(range?.from ?? tr.selection.from, 0), docSize);
      const to = Math.min(Math.max(range?.to ?? from, from), docSize);
      const node = nodeType.create(attrs);

      if (dispatch) {
        tr.replaceRangeWith(from, to, node);
        dispatch(tr.scrollIntoView());
      }
      return true;
    })
    .run();
}

export function ArticleEditor({ article, articles = [] }: { article?: Article | null; articles?: Article[] }) {
  const [state, formAction, pending] = useActionState(saveArticleAction, initialState);
  const [clientMessage, setClientMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savedId, setSavedId] = useState(article?.id ?? "");
  const [title, setTitle] = useState(inlineToHtml(article?.title ?? ""));
  const [excerpt, setExcerpt] = useState(inlineToHtml(article?.excerpt ?? ""));
  const titleText = useMemo(() => htmlToText(title), [title]);
  const excerptText = useMemo(() => htmlToText(excerpt), [excerpt]);
  const generatedSlug = useMemo(() => slugify(titleText), [titleText]);
  const [slug, setSlug] = useState(article?.slug ?? generatedSlug);
  const [cover, setCover] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [statusValue, setStatusValue] = useState(article?.status ?? "draft");
  const [category, setCategory] = useState(article?.category && EDITOR_CATEGORIES.includes(article.category) ? article.category : "Vida");
  const [readTime, setReadTime] = useState(article?.readTime ?? "5 min leer");
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const initialEditorContent = useMemo(() => legacyContentToHtml(article?.content), [article?.content]);
  const [editorHtml, setEditorHtml] = useState(initialEditorContent);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localSave, setLocalSave] = useState("Autosave local listo");
  const [serverSave, setServerSave] = useState("Guardado");
  const [linkModal, setLinkModal] = useState({ open: false, title: "", url: "", newTab: true });
  const [spotifyModal, setSpotifyModal] = useState({ open: false, pos: -1, title: "", url: "" });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [hexColor, setHexColor] = useState("#7B3DFF");
  const [zoom, setZoom] = useState(100);
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>("magazineVertical");
  const [pages, setPages] = useState(1);
  const [activePanel, setActivePanel] = useState<"content" | "design">("content");
  const [selectedKind, setSelectedKind] = useState<"text" | "image" | "video" | null>(null);
  const [lastSelectedImage, setLastSelectedImage] = useState("");
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const bodySelectionRef = useRef<{ from: number; to: number } | null>(null);

  const titleEditor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions("Título del artículo"),
    content: title || "<p></p>",
    onFocus: ({ editor: currentEditor }) => setActiveEditor(currentEditor),
    onUpdate: ({ editor: currentEditor }) => {
      const nextTitle = currentEditor.getHTML();
      setTitle(nextTitle);
      if (!slug.trim() || (!article?.slug && !state.slug)) setSlug(slugify(htmlToText(nextTitle)));
    },
  });

  const excerptEditor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions("Escribe un extracto que abra la tensión del artículo..."),
    content: excerpt || "<p></p>",
    onFocus: ({ editor: currentEditor }) => setActiveEditor(currentEditor),
    onUpdate: ({ editor: currentEditor }) => setExcerpt(currentEditor.getHTML()),
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions("Empieza a escribir..."),
    content: initialEditorContent,
    editorProps: {
      handleClick(view, _pos, event) {
        const target = (event.target as HTMLElement).closest("a[data-spotify-card]") as HTMLAnchorElement | null;
        if (!target) return false;
        event.preventDefault();
        setSpotifyModal({
          open: true,
          pos: view.posAtDOM(target, 0),
          title: target.dataset.title || target.textContent || "Contenido de Spotify",
          url: target.href,
        });
        return true;
      },
    },
    onFocus: ({ editor: currentEditor }) => {
      setActiveEditor(currentEditor);
      bodySelectionRef.current = { from: currentEditor.state.selection.from, to: currentEditor.state.selection.to };
    },
    onUpdate: ({ editor: currentEditor }) => setEditorHtml(currentEditor.getHTML()),
    onSelectionUpdate: ({ editor: currentEditor }) => {
      bodySelectionRef.current = { from: currentEditor.state.selection.from, to: currentEditor.state.selection.to };
      const image = currentEditor.getAttributes("image").src as string | undefined;
      const video = currentEditor.getAttributes("videoEmbed").src as string | undefined;
      if (image) {
        setSelectedKind("image");
        setLastSelectedImage(image);
      } else if (video) {
        setSelectedKind("video");
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
    setLeftRailCollapsed(window.localStorage.getItem("off-editor-left-collapsed") === "true");
    setRightRailCollapsed(window.localStorage.getItem("off-editor-right-collapsed") === "true");
    const storedZoom = Number(window.localStorage.getItem("off-editor-zoom"));
    if (ZOOM_LEVELS.includes(storedZoom)) setZoom(storedZoom);
    const storedPageSize = window.localStorage.getItem("off-editor-page-size") as keyof typeof PAGE_SIZES | null;
    if (storedPageSize && storedPageSize in PAGE_SIZES) setPageSize(storedPageSize);
  }, []);

  function toggleLeftRail() {
    const next = !leftRailCollapsed;
    setLeftRailCollapsed(next);
    window.localStorage.setItem("off-editor-left-collapsed", String(next));
  }

  function toggleRightRail() {
    const next = !rightRailCollapsed;
    setRightRailCollapsed(next);
    window.localStorage.setItem("off-editor-right-collapsed", String(next));
  }

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
    if (!titleText.trim() && !excerptText.trim() && !readableText) return;
    if (overLimit || uploading) return;

    setServerSave("Guardando...");
    const timeout = window.setTimeout(async () => {
      const payload: AutosaveArticlePayload = {
        id: savedId,
        title,
        slug: slug || slugify(titleText),
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
  }, [category, contentJson, cover, editorHtml, excerpt, excerptText, featured, overLimit, readTime, savedId, slug, statusValue, title, titleText, uploading]);

  function currentEditor() {
    return activeEditor ?? editor;
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
      setClientMessage(error instanceof Error ? error.message : "No se pudo subir el archivo. Revisa formato o tamaño.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInlineImageFile(file?: File) {
    if (!file || !editor) return;
    setUploading(true);
    setClientMessage("Subiendo archivo...");
    try {
      const url = await uploadEditorFile(file);
      const range = bodySelectionRef.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
      let inserted = false;
      if (isVideoFile(file)) {
        inserted = insertMediaNode(editor, "videoEmbed", { src: url, size: "medium" }, range);
      } else {
        inserted = insertMediaNode(editor, "image", { src: url, alt: file.name || "Imagen editorial", layout: "center" }, range);
      }
      if (!inserted) {
        throw new Error("No se pudo insertar el archivo en la hoja.");
      }
      bodySelectionRef.current = { from: editor.state.selection.to, to: editor.state.selection.to };
      setEditorHtml(editor.getHTML());
      setClientMessage("");
    } catch (error) {
      setClientMessage(error instanceof Error ? error.message : "No se pudo subir el archivo. Revisa formato o tamaño.");
    } finally {
      setUploading(false);
    }
  }

  function openImagePicker() {
    if (editor) bodySelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    imageInputRef.current?.click();
  }

  function openVideoPicker() {
    if (editor) bodySelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    videoInputRef.current?.click();
  }

  function insertSpotifyCard() {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    const url = window.prompt("Pega el link de Spotify");
    if (!url) return;
    if (!/^https?:\/\/(open\.)?spotify\.com\//i.test(url.trim())) {
      setClientMessage("Pega un enlace válido de Spotify.");
      return;
    }
    targetEditor.chain().focus().insertContent({ type: "spotifyEmbed", attrs: { url: url.trim(), title: "Contenido de Spotify" } }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setClientMessage("");
  }

  function confirmSpotify() {
    if (!editor || spotifyModal.pos < 0) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(spotifyModal.pos);
        if (!node) return false;
        tr.setNodeMarkup(spotifyModal.pos, undefined, {
          ...node.attrs,
          url: spotifyModal.url.trim(),
          title: spotifyModal.title.trim() || "Contenido de Spotify",
        });
        return true;
      })
      .run();
    setEditorHtml(editor.getHTML());
    setSpotifyModal({ open: false, pos: -1, title: "", url: "" });
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
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    const currentHref = targetEditor.getAttributes("link").href as string | undefined;
    const { from, to } = targetEditor.state.selection;
    const selectedTitle = targetEditor.state.doc.textBetween(from, to, " ").trim();
    setLinkModal({ open: true, title: selectedTitle, url: currentHref ?? "", newTab: true });
  }

  function confirmLink() {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    const url = linkModal.url.trim();
    const title = linkModal.title.trim();
    if (!url) {
      targetEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModal({ open: false, title: "", url: "", newTab: true });
      return;
    }

    const { from, to } = targetEditor.state.selection;
    const selectedTitle = targetEditor.state.doc.textBetween(from, to, " ").trim();
    const label = title || selectedTitle || "Link";
    targetEditor.chain().focus().insertContentAt({ from, to }, `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(label)}</a>`).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setLinkModal({ open: false, title: "", url: "", newTab: true });
  }

  function applyColor(color: string, close = false) {
    const targetEditor = currentEditor();
    if (!targetEditor || !HEX_PATTERN.test(color)) {
      setClientMessage("Escribe un color HEX valido, por ejemplo #7B3DFF.");
      return;
    }
    targetEditor.chain().focus().setColor(color).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setHexColor(color.toUpperCase());
    if (close) setPaletteOpen(false);
    setClientMessage("");
  }

  function applyFontSize(size: string) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    targetEditor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
  }

  function applyFont(font: (typeof EDITOR_FONTS)[number]) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    targetEditor.chain().focus().setMark("textStyle", {
      fontFamily: font.family,
      fontVariationSettings: font.variation ?? null,
    }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setFontOpen(false);
  }

  function applyLineHeight(lineHeight: string) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    targetEditor.chain().focus().setMark("textStyle", { lineHeight }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
  }

  function applyHeadingToken(token: string) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    const map: Record<string, string> = {
      H1: "48px",
      H2: "38px",
      H3: "30px",
      H4: "24px",
      H5: "20px",
      H6: "18px",
      H7: "16px",
      H8: "14px",
    };
    if (token === "H1") targetEditor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (token === "H2") targetEditor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (token === "H3") targetEditor.chain().focus().toggleHeading({ level: 3 }).run();
    else targetEditor.chain().focus().setMark("textStyle", { fontSize: map[token] }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setHeadingOpen(false);
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

  function applyVideoSize(size: "small" | "medium" | "large") {
    if (!editor) return;
    editor.chain().focus().updateAttributes("videoEmbed", { size }).run();
    setEditorHtml(editor.getHTML());
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    window.localStorage.setItem("off-editor-zoom", String(nextZoom));
  }

  function changePageSize(nextSize: keyof typeof PAGE_SIZES) {
    setPageSize(nextSize);
    window.localStorage.setItem("off-editor-page-size", nextSize);
  }

  function addPage() {
    editor?.chain().focus().setHorizontalRule().run();
    if (editor) setEditorHtml(editor.getHTML());
    setPages((current) => current + 1);
  }

  function removePage() {
    setPages((current) => Math.max(1, current - 1));
  }

  const toolbarEditor = activeEditor ?? editor;
  const canUseToolbar = Boolean(toolbarEditor);
  const page = PAGE_SIZES[pageSize];

  return (
    <form action={formAction} className="magazine-editor premium-editor document-editor-shell" onSubmit={validateSubmit}>
      <AdminSessionGuard />
      <input name="id" type="hidden" value={savedId} />
      <input name="content" type="hidden" value={contentJson} />
      <input name="coverImage" type="hidden" value={cover} />
      <input name="status" type="hidden" value={statusValue} />
      <input name="category" type="hidden" value={category} />
      <input name="readTime" type="hidden" value={readTime} />
      {featured ? <input name="featured" type="hidden" value="on" /> : null}

      <header className="editor-topbar premium-editor-topbar document-editor-topbar">
        <div>
          <a className="editor-logo-link" href="/admin" aria-label="Volver al admin">
            <img src="/logo/logo-off.png" alt="OFF" />
          </a>
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
            <div className="link-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setLinkModal({ open: false, title: "", url: "", newTab: true })}>Cancelar</button>
              <button type="button" className="button" onClick={confirmLink}>Aplicar</button>
            </div>
          </div>
        </div>
      ) : null}

      {spotifyModal.open ? (
        <div className="link-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar Spotify">
          <div className="link-modal spotify-edit-modal">
            <strong>Spotify</strong>
            <label>
              Título del enlace
              <input value={spotifyModal.title} onChange={(event) => setSpotifyModal((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              URL
              <input value={spotifyModal.url} onChange={(event) => setSpotifyModal((current) => ({ ...current, url: event.target.value }))} />
            </label>
            <div className="link-modal-actions">
              <a className="ghost-button" href={spotifyModal.url} target="_blank">Abrir enlace</a>
              <button type="button" className="ghost-button" onClick={() => setSpotifyModal({ open: false, pos: -1, title: "", url: "" })}>Cancelar</button>
              <button type="button" className="button" onClick={confirmSpotify}>Aplicar</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`document-editor-frame ${leftRailCollapsed ? "left-rail-collapsed" : ""} ${rightRailCollapsed ? "right-rail-collapsed" : ""}`}>
        <aside className="document-left-rail">
          <button className="rail-collapse-button" type="button" onClick={toggleLeftRail} aria-label={leftRailCollapsed ? "Expandir documentos" : "Contraer documentos"}>
            {leftRailCollapsed ? ">" : "<"}
          </button>
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
                    <strong>{htmlToText(doc.title) || "Sin titulo"}</strong>
                    <span><i />Publicado</span>
                  </a>
                ))}
                <span className="document-section-label">Borradores</span>
                {articles.filter((doc) => doc.status !== "published").slice(0, 12).map((doc) => (
                  <a className={doc.id === savedId ? "document-list-item active" : "document-list-item"} href={`/admin/${doc.id}`} key={doc.id}>
                    <strong>{htmlToText(doc.title) || "Sin titulo"}</strong>
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
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().setParagraph().run()}>Parrafo</button>
              <div className="toolbar-dropdown font-dropdown">
                <button type="button" disabled={!canUseToolbar} onClick={() => setFontOpen((open) => !open)}>Tipografías</button>
                {fontOpen ? (
                  <div className="toolbar-menu font-menu">
                    {EDITOR_FONTS.map((font) => (
                      <button
                        type="button"
                        key={font.label}
                        onClick={() => applyFont(font)}
                        style={{ fontFamily: font.family, fontVariationSettings: font.variation }}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="toolbar-dropdown">
                <button type="button" disabled={!canUseToolbar} onClick={() => setHeadingOpen((open) => !open)}>HT</button>
                {headingOpen ? (
                  <div className="toolbar-menu">
                    {["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8"].map((token) => (
                      <button type="button" key={token} onClick={() => applyHeadingToken(token)}>{token}</button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBlockquote().run()}>Quote</button>
            </div>
            <div className="doc-toolbar-group">
              <button type="button" className={toolbarEditor?.isActive("bold") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBold().run()}>B</button>
              <button type="button" className={toolbarEditor?.isActive("italic") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleItalic().run()}>I</button>
              <button type="button" className={toolbarEditor?.isActive("underline") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleUnderline().run()}>U</button>
              <button type="button" className={toolbarEditor?.isActive("strike") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleStrike().run()}>S</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleHighlight({ color: "#7b3dff55" }).run()}>Highlight</button>
              <button type="button" disabled={!canUseToolbar} onClick={applyLink}>Link</button>
            </div>
            <div className="doc-toolbar-group">
              <div className="palette-wrap">
                <button type="button" disabled={!canUseToolbar} onClick={() => setPaletteOpen((open) => !open)}>Paleta</button>
                {paletteOpen ? (
                  <div className="palette-popover">
                    <span>Colores OFF</span>
                    <div className="palette-swatches">
                      {PALETTE_COLORS.map((color) => (
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
                    <button type="button" onClick={() => applyColor(hexColor, true)}>Aplicar HEX</button>
                  </div>
                ) : null}
              </div>
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBulletList().run()}>Bullets</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleOrderedList().run()}>1.</button>
              <button type="button" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().setHorizontalRule().run()}>Divider</button>
              <button type="button" disabled={!canUseToolbar || uploading} onClick={openImagePicker}>Imagen</button>
              <button type="button" disabled={!canUseToolbar || uploading} onClick={openVideoPicker}>Video</button>
              <button type="button" disabled={!canUseToolbar} onClick={insertSpotifyCard}>Spotify</button>
              <input ref={imageInputRef} hidden type="file" accept={IMAGE_ACCEPT} onChange={(event) => { void handleInlineImageFile(event.target.files?.[0]); event.target.value = ""; }} />
              <input ref={videoInputRef} hidden type="file" accept={VIDEO_ACCEPT} onChange={(event) => { void handleInlineImageFile(event.target.files?.[0]); event.target.value = ""; }} />
            </div>
            <div className="doc-toolbar-group page-toolbar-group">
              <select value={pageSize} onChange={(event) => changePageSize(event.target.value as keyof typeof PAGE_SIZES)} aria-label="Tamaño de hoja">
                {Object.entries(PAGE_SIZES).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}
              </select>
              <select value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Zoom">
                {ZOOM_LEVELS.map((level) => <option value={level} key={level}>{level}%</option>)}
              </select>
              <button type="button" onClick={addPage}>+ Hoja</button>
              <button type="button" disabled={pages === 1} onClick={removePage}>Eliminar hoja</button>
            </div>
          </nav>

          <div className="editor-page-stage" style={{ "--page-zoom": zoom / 100 } as CSSProperties}>
            <motion.main
              className="editor-canvas premium-editor-canvas document-page tiptap-page editor-paper-sheet"
              style={{ "--page-width": `${page.width}px`, "--page-min-height": `${page.minHeight}px` } as CSSProperties}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <input name="title" type="hidden" value={title} />
              <input name="excerpt" type="hidden" value={excerpt} />
              <div className="paper-label">{page.label} · {zoom}%</div>
              <EditorContent editor={titleEditor} className="tiptap-title-editor document-title" />
              <EditorContent editor={excerptEditor} className="tiptap-excerpt-editor document-excerpt" />
              <div className="document-meta-line">
                <span>{article?.status ?? "draft"}</span>
                <span>{characterCount.toLocaleString()} caracteres</span>
                <span>{localSave}</span>
              </div>
              <EditorContent editor={editor} className="tiptap-editor" />
            </motion.main>
            <AnimatePresence>
              {Array.from({ length: Math.max(0, pages - 1) }).map((_, index) => (
                <motion.section
                  className="editor-paper-sheet editor-paper-sheet-empty"
                  style={{ "--page-width": `${page.width}px`, "--page-min-height": `${page.minHeight}px` } as CSSProperties}
                  key={`page-${index + 2}`}
                  initial={{ opacity: 0, y: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -18, scale: 0.96 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                >
                  <span>Hoja {index + 2}</span>
                  <p>Continúa escribiendo en el documento principal. Esta hoja marca la estructura visual del artículo.</p>
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        </section>

        <aside className="editor-sidebar premium-editor-sidebar document-right-rail">
          <button className="rail-collapse-button right" type="button" onClick={toggleRightRail} aria-label={rightRailCollapsed ? "Expandir configuracion" : "Contraer configuracion"}>
            {rightRailCollapsed ? "<" : ">"}
          </button>
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
                  <input ref={coverInputRef} type="file" accept={IMAGE_ACCEPT} onChange={(event) => void handleCoverFile(event.target.files?.[0])} />
                </label>
                <input value={cover} placeholder="Ruta de portada" onChange={(event) => { setCover(event.target.value); setCoverPreview(event.target.value); }} />
                <button type="button" onClick={() => { setCover(""); setCoverPreview(""); }}>Quitar portada</button>
              </div>
              <div className="right-panel-group">
                <label className="field">Estado<select name="status" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                <label className="field">Categoria
                  <select value={category} onChange={(event) => setCategory(event.target.value)} required>
                    {EDITOR_CATEGORIES.map((item) => <option value={item} key={item}>{item}</option>)}
                  </select>
                </label>
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
                  if (value === "paragraph") toolbarEditor?.chain().focus().setParagraph().run();
                  if (value === "title") toolbarEditor?.chain().focus().toggleHeading({ level: 1 }).run();
                  if (value === "subtitle" || value === "h2") toolbarEditor?.chain().focus().toggleHeading({ level: 2 }).run();
                  if (value === "h3") toolbarEditor?.chain().focus().toggleHeading({ level: 3 }).run();
                  if (value === "quote") toolbarEditor?.chain().focus().toggleBlockquote().run();
                }} defaultValue="paragraph">
                  <option value="paragraph">Parrafo</option>
                  <option value="title">Titulo</option>
                  <option value="subtitle">Subtitulo</option>
                  <option value="h2">H2</option>
                  <option value="h3">H3</option>
                  <option value="quote">Cita</option>
                </select>
              </label>
              <label className="field">Color de texto<input value={hexColor} onChange={(event) => setHexColor(event.target.value)} onBlur={() => applyColor(hexColor)} placeholder="#7B3DFF" /></label>
              <div className="design-button-row">
                <button type="button" onClick={() => toolbarEditor?.chain().focus().setTextAlign("left").run()}>Izquierda</button>
                <button type="button" onClick={() => toolbarEditor?.chain().focus().setTextAlign("center").run()}>Centro</button>
                <button type="button" onClick={() => toolbarEditor?.chain().focus().setTextAlign("right").run()}>Derecha</button>
              </div>
              <label className="field">Espaciado
                <select onChange={(event) => applyLineHeight(event.target.value)} defaultValue="">
                  <option value="" disabled>Seleccionar</option>
                  <option value="0.5em">0.5</option>
                  <option value="1em">1.0</option>
                  <option value="1.5em">1.5</option>
                  <option value="2em">2.0</option>
                  <option value="2.5em">2.5</option>
                </select>
              </label>
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
              {selectedKind === "video" ? (
                <div className="design-button-row">
                  <button type="button" onClick={() => applyVideoSize("small")}>Video pequeño</button>
                  <button type="button" onClick={() => applyVideoSize("medium")}>Video mediano</button>
                  <button type="button" onClick={() => applyVideoSize("large")}>Video grande</button>
                </div>
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
            <h1 dangerouslySetInnerHTML={{ __html: safePreviewHtml(title || "Titulo del articulo") }} />
            <div className="preview-excerpt" dangerouslySetInnerHTML={{ __html: safePreviewHtml(excerpt || "Extracto editorial") }} />
            <div className="reader" dangerouslySetInnerHTML={{ __html: safePreviewHtml(editorHtml) }} />
          </section>
        </div>
      ) : null}
    </form>
  );
}



