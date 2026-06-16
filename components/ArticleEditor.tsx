"use client";

import type { Article } from "@prisma/client";
import { Extension, Node as TiptapNode, type Editor as TiptapEditor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
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
import {
  AlignVerticalSpaceAround,
  Bold,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Plus,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { autosaveArticleAction, deleteArticleAction, logoutAction, saveArticleAction, type AutosaveArticlePayload, type SaveArticleState } from "@/app/actions";
import { AdminSessionGuard } from "@/components/AdminSessionGuard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
const LINE_HEIGHT_OPTIONS = ["0.5", "1", "1.5", "2", "2.5"] as const;
const HEADING_TOKENS = {
  H1: { fontSize: "48px", lineHeight: "1" },
  H2: { fontSize: "38px", lineHeight: "1.1" },
  H3: { fontSize: "30px", lineHeight: "1.15" },
  H4: { fontSize: "24px", lineHeight: "1.18" },
  H5: { fontSize: "20px", lineHeight: "1.22" },
  H6: { fontSize: "18px", lineHeight: "1.25" },
  H7: { fontSize: "16px", lineHeight: "1.3" },
  H8: { fontSize: "14px", lineHeight: "1.3" },
} as const;
const MEDIA_SIZES = {
  small: "360px",
  medium: "640px",
  large: "820px",
  full: "100%",
} as const;
const WRAP_MODES = [
  { value: "inline", label: "En línea con el texto" },
  { value: "square", label: "Cuadrado" },
  { value: "tight", label: "Estrecho" },
  { value: "transparent", label: "Transparente" },
  { value: "top-bottom", label: "Arriba y abajo" },
  { value: "behind", label: "Detrás del texto" },
  { value: "front", label: "Delante del texto" },
] as const;
const MEDIA_POSITION_OPTIONS = [
  { value: "above", label: "Encima del texto" },
  { value: "below", label: "Debajo del texto" },
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
  { value: "center", label: "Centro" },
  { value: "wrap", label: "Ajustar al texto" },
] as const;
const ASPECT_RATIOS = [
  { value: "", label: "Libre" },
  { value: "1 / 1", label: "1:1" },
  { value: "4 / 3", label: "4:3" },
  { value: "16 / 9", label: "16:9" },
  { value: "4 / 5", label: "Vertical 4:5" },
] as const;
const PAGE_SIZES = {
  a4: { label: "A4", width: 794, minHeight: 1123 },
  letter: { label: "Carta", width: 816, minHeight: 1056 },
  magazineVertical: { label: "Revista vertical", width: 820, minHeight: 1160 },
  magazineHorizontal: { label: "Revista horizontal", width: 1080, minHeight: 760 },
  custom: { label: "Custom", width: 920, minHeight: 1040 },
} as const;
const COLLAGE_TEMPLATES = [
  { id: "two-equal", label: "2 columnas iguales", slots: 2 },
  { id: "three-equal", label: "3 columnas iguales", slots: 3 },
  { id: "large-left", label: "Grande izquierda + 2 derecha", slots: 3 },
  { id: "large-right", label: "2 izquierda + grande derecha", slots: 3 },
  { id: "grid-2x2", label: "Grid 2x2", slots: 4 },
  { id: "asymmetric", label: "Editorial asimétrico", slots: 4 },
  { id: "hero-thumbs", label: "Full width + 3 miniaturas", slots: 4 },
] as const;
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
  parseHTML() {
    return [
      {
        tag: "figure[data-media-type=\"image\"]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const image = element.querySelector("img");
          if (!image) return false;
          return {
            src: image.getAttribute("src"),
            alt: image.getAttribute("alt") ?? "Imagen editorial",
            title: image.getAttribute("title"),
            caption: element.querySelector("figcaption")?.textContent ?? "",
            layout: element.getAttribute("data-layout") ?? image.getAttribute("data-layout") ?? "center",
            width: element.getAttribute("data-width") ?? null,
            wrapMode: element.getAttribute("data-wrap") ?? "top-bottom",
            objectFit: image.getAttribute("data-fit") ?? "cover",
            objectPosition: image.getAttribute("data-position") ?? "50% 50%",
            aspectRatio: image.getAttribute("data-ratio") ?? "",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement) || element.closest("figure[data-media-type=\"image\"]")) return false;
          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt") ?? "Imagen editorial",
            title: element.getAttribute("title"),
            caption: element.getAttribute("data-caption") ?? "",
            layout: element.getAttribute("data-layout") ?? "center",
            objectFit: element.getAttribute("data-fit") ?? "cover",
            objectPosition: element.getAttribute("data-position") ?? "50% 50%",
            aspectRatio: element.getAttribute("data-ratio") ?? "",
          };
        },
      },
    ];
  },
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
        parseHTML: (element) => element.getAttribute("width") || element.style.width || element.closest("figure")?.getAttribute("data-width") || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width};` };
        },
      },
      caption: {
        default: "",
        parseHTML: (element) => element.closest("figure")?.querySelector("figcaption")?.textContent ?? element.getAttribute("data-caption") ?? "",
      },
      wrapMode: {
        default: "top-bottom",
        parseHTML: (element) => element.closest("figure")?.getAttribute("data-wrap") ?? element.getAttribute("data-wrap") ?? "top-bottom",
      },
      objectFit: {
        default: "cover",
        parseHTML: (element) => element.getAttribute("data-fit") ?? "cover",
      },
      objectPosition: {
        default: "50% 50%",
        parseHTML: (element) => element.getAttribute("data-position") ?? "50% 50%",
      },
      aspectRatio: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-ratio") ?? "",
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const {
      caption,
      layout,
      width,
      wrapMode,
      objectFit,
      objectPosition,
      aspectRatio,
      style: _style,
      ...imageAttributes
    } = HTMLAttributes;
    const imageStyle = [
      objectFit ? `object-fit: ${objectFit}` : "",
      objectPosition ? `object-position: ${objectPosition}` : "",
      aspectRatio ? `aspect-ratio: ${aspectRatio}` : "",
    ].filter(Boolean).join("; ");

    return [
      "figure",
      {
        class: "editor-media-node",
        "data-media-type": "image",
        "data-layout": layout || "center",
        "data-wrap": wrapMode || "top-bottom",
        "data-width": width || "",
        style: width ? `width: ${width};` : undefined,
      },
      ["img", {
        ...imageAttributes,
        "data-layout": layout || "center",
        "data-fit": objectFit || "cover",
        "data-position": objectPosition || "50% 50%",
        "data-ratio": aspectRatio || "",
        style: imageStyle || undefined,
      }],
      ["figcaption", { "data-empty": caption ? "false" : "true" }, caption || ""],
    ];
  },
});

const VideoEmbed = TiptapNode.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector?.("video")?.getAttribute("src") ?? element.getAttribute("src"),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.querySelector?.("figcaption")?.textContent ?? element.getAttribute("data-caption") ?? "",
      },
      size: {
        default: "medium",
        parseHTML: (element) => element.querySelector?.("video")?.getAttribute("data-size") ?? element.getAttribute("data-size") ?? "medium",
      },
      layout: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-layout") ?? element.closest("figure")?.getAttribute("data-layout") ?? "center",
      },
      width: {
        default: MEDIA_SIZES.medium,
        parseHTML: (element) => element.getAttribute("data-width") ?? element.closest("figure")?.getAttribute("data-width") ?? MEDIA_SIZES.medium,
      },
      wrapMode: {
        default: "top-bottom",
        parseHTML: (element) => element.getAttribute("data-wrap") ?? element.closest("figure")?.getAttribute("data-wrap") ?? "top-bottom",
      },
      objectFit: {
        default: "cover",
        parseHTML: (element) => element.querySelector?.("video")?.getAttribute("data-fit") ?? element.getAttribute("data-fit") ?? "cover",
      },
      objectPosition: {
        default: "50% 50%",
        parseHTML: (element) => element.querySelector?.("video")?.getAttribute("data-position") ?? element.getAttribute("data-position") ?? "50% 50%",
      },
      aspectRatio: {
        default: "16 / 9",
        parseHTML: (element) => element.querySelector?.("video")?.getAttribute("data-ratio") ?? element.getAttribute("data-ratio") ?? "16 / 9",
      },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-media-type=\"video\"]" }, { tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const video = HTMLAttributes;
    const width = video.width || MEDIA_SIZES[video.size as keyof typeof MEDIA_SIZES] || MEDIA_SIZES.medium;
    const videoStyle = [
      video.objectFit ? `object-fit: ${video.objectFit}` : "",
      video.objectPosition ? `object-position: ${video.objectPosition}` : "",
      video.aspectRatio ? `aspect-ratio: ${video.aspectRatio}` : "",
    ].filter(Boolean).join("; ");

    return [
      "figure",
      {
        class: "editor-media-node",
        "data-media-type": "video",
        "data-layout": video.layout || "center",
        "data-wrap": video.wrapMode || "top-bottom",
        "data-width": width,
        style: width ? `width: ${width};` : undefined,
      },
      ["video", {
        src: video.src,
        "data-size": video.size || "medium",
        "data-layout": video.layout || "center",
        "data-fit": video.objectFit || "cover",
        "data-position": video.objectPosition || "50% 50%",
        "data-ratio": video.aspectRatio || "16 / 9",
        controls: "true",
        style: videoStyle || undefined,
      }],
      ["figcaption", { "data-empty": video.caption ? "false" : "true" }, video.caption || ""],
    ];
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

const EditorialCollage = TiptapNode.create({
  name: "editorialCollage",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      template: { default: "two-equal" },
      images: {
        default: [],
        parseHTML: (element) => Array.from(element.querySelectorAll("[data-collage-slot] img")).map((image) => ({
          src: image.getAttribute("src") ?? "",
          alt: image.getAttribute("alt") ?? "Imagen de collage",
        })),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.querySelector("figcaption")?.textContent ?? "",
      },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-editorial-collage]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const images = Array.isArray(HTMLAttributes.images) ? HTMLAttributes.images : [];
    return [
      "figure",
      {
        class: `editorial-collage collage-${HTMLAttributes.template || "two-equal"}`,
        "data-editorial-collage": "true",
        "data-template": HTMLAttributes.template || "two-equal",
      },
      ["div", { class: "editorial-collage-grid" }, ...images.map((image: { src?: string; alt?: string }, index: number) => [
        "div",
        { class: "collage-slot", "data-collage-slot": String(index) },
        image.src ? ["img", { src: image.src, alt: image.alt || "Imagen de collage" }] : ["span", {}, `Imagen ${index + 1}`],
      ])],
      ["figcaption", { "data-empty": HTMLAttributes.caption ? "false" : "true" }, HTMLAttributes.caption || ""],
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
    EditorialCollage,
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
  wrapMode?: string;
  objectFit?: string;
  objectPosition?: string;
  aspectRatio?: string;
  width?: string;
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
        return `<figure data-media-type="image" data-layout="${escapeHtml(block.align ?? "center")}" data-wrap="${escapeHtml(block.wrapMode ?? "top-bottom")}" data-width="${escapeHtml(block.width ?? "")}"${block.width ? ` style="width: ${escapeHtml(block.width)};"` : ""}><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? block.caption ?? "Imagen editorial")}" data-layout="${escapeHtml(block.align ?? "center")}" data-fit="${escapeHtml(block.objectFit ?? "cover")}" data-position="${escapeHtml(block.objectPosition ?? "50% 50%")}" data-ratio="${escapeHtml(block.aspectRatio ?? "")}">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "<figcaption data-empty=\"true\"></figcaption>"}</figure>`;
      }
      if ((block.type === "gallery" || block.type === "collage") && block.images?.length) {
        return `<figure class="editorial-collage collage-grid-2x2" data-editorial-collage="true" data-template="grid-2x2"><div class="editorial-collage-grid">${block.images.map((image, index) => `<div class="collage-slot" data-collage-slot="${index}">${image.src ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt ?? "Imagen editorial")}">` : `<span>Imagen ${index + 1}</span>`}</div>`).join("")}</div></figure>`;
      }
      if (block.type === "video" && block.url) {
        const width = block.width ?? MEDIA_SIZES[(block.label as keyof typeof MEDIA_SIZES) ?? "medium"] ?? MEDIA_SIZES.medium;
        return `<figure data-media-type="video" data-layout="${escapeHtml(block.align ?? "center")}" data-wrap="${escapeHtml(block.wrapMode ?? "top-bottom")}" data-width="${escapeHtml(width)}" style="width: ${escapeHtml(width)};"><video src="${escapeHtml(block.url)}" data-size="${escapeHtml(block.label ?? "medium")}" data-layout="${escapeHtml(block.align ?? "center")}" data-fit="${escapeHtml(block.objectFit ?? "cover")}" data-position="${escapeHtml(block.objectPosition ?? "50% 50%")}" data-ratio="${escapeHtml(block.aspectRatio ?? "16 / 9")}" controls></video>${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "<figcaption data-empty=\"true\"></figcaption>"}</figure>`;
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

type TranslationEnvelope = {
  type: "off-article-translations";
  originalLanguage?: "es" | "en" | "it" | "pt";
  translations?: Partial<Record<"es" | "en" | "it" | "pt", { title?: string; excerpt?: string; content?: string }>>;
};

function readTranslationEnvelope(content?: string): TranslationEnvelope | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as TranslationEnvelope;
    return parsed?.type === "off-article-translations" ? parsed : null;
  } catch {
    return null;
  }
}

function preserveTranslationEnvelope(source: string | undefined, title: string, excerpt: string, content: string) {
  const envelope = readTranslationEnvelope(source);
  if (!envelope) return content;
  const originalLanguage = envelope.originalLanguage ?? "es";
  return JSON.stringify({
    ...envelope,
    originalLanguage,
    translations: {
      ...envelope.translations,
      [originalLanguage]: { title, excerpt, content },
    },
  });
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

    const collage = node.matches("figure[data-editorial-collage]") ? node : node.querySelector("figure[data-editorial-collage]");
    if (collage) {
      blocks.push({
        type: "collage",
        images: Array.from(collage.querySelectorAll("[data-collage-slot]")).map((slot) => ({
          src: slot.querySelector("img")?.getAttribute("src") ?? "",
          alt: slot.querySelector("img")?.getAttribute("alt") ?? "Imagen editorial",
        })),
        caption: collage.querySelector("figcaption")?.textContent ?? "",
        template: collage.getAttribute("data-template") ?? "two-equal",
      });
      return;
    }

    const imageElement = node.matches("img") ? node : node.querySelector("img");
    if (imageElement) {
      const figure = imageElement.closest("figure");
      const src = imageElement.getAttribute("src") ?? "";
      if (src) {
        blocks.push({
          type: "image",
          src,
          alt: imageElement.getAttribute("alt") ?? "Imagen editorial",
          caption: figure?.querySelector("figcaption")?.textContent ?? imageElement.getAttribute("data-caption") ?? "",
          align: figure?.getAttribute("data-layout") ?? imageElement.getAttribute("data-layout") ?? "center",
          width: figure?.getAttribute("data-width") ?? imageElement.getAttribute("style") ?? undefined,
          wrapMode: figure?.getAttribute("data-wrap") ?? "top-bottom",
          objectFit: imageElement.getAttribute("data-fit") ?? "cover",
          objectPosition: imageElement.getAttribute("data-position") ?? "50% 50%",
          aspectRatio: imageElement.getAttribute("data-ratio") ?? "",
        });
      }
      return;
    }

    const videoElement = node.matches("video") ? node : node.querySelector("video");
    if (videoElement) {
      const figure = videoElement.closest("figure");
      const src = videoElement.getAttribute("src") ?? "";
      if (src) blocks.push({
        type: "video",
        url: src,
        caption: figure?.querySelector("figcaption")?.textContent ?? videoElement.getAttribute("data-caption") ?? "",
        label: videoElement.getAttribute("data-size") ?? "medium",
        align: figure?.getAttribute("data-layout") ?? videoElement.getAttribute("data-layout") ?? "center",
        width: figure?.getAttribute("data-width") ?? undefined,
        wrapMode: figure?.getAttribute("data-wrap") ?? "top-bottom",
        objectFit: videoElement.getAttribute("data-fit") ?? "cover",
        objectPosition: videoElement.getAttribute("data-position") ?? "50% 50%",
        aspectRatio: videoElement.getAttribute("data-ratio") ?? "16 / 9",
      });
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
          align: node.getAttribute("data-layout") ?? image?.getAttribute("data-layout") ?? "center",
          width: node.getAttribute("data-width") ?? image?.getAttribute("style") ?? undefined,
          wrapMode: node.getAttribute("data-wrap") ?? "top-bottom",
          objectFit: image?.getAttribute("data-fit") ?? "cover",
          objectPosition: image?.getAttribute("data-position") ?? "50% 50%",
          aspectRatio: image?.getAttribute("data-ratio") ?? "",
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

function isSafeMediaUrl(kind: "image" | "video", url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const extension = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
    if (kind === "image") return ["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff", "svg"].includes(extension) || /^https?:\/\//i.test(url);
    return ["mp4", "mov", "mkv", "wmv", "webm", "m4v"].includes(extension) || /^https?:\/\//i.test(url);
  } catch {
    return false;
  }
}

function canLoadRemoteMedia(kind: "image" | "video", url: string) {
  return new Promise<boolean>((resolve) => {
    if (kind === "image") {
      const image = new window.Image();
      const timeout = window.setTimeout(() => resolve(false), 8000);
      image.onload = () => {
        window.clearTimeout(timeout);
        resolve(true);
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };
      image.src = url;
      return;
    }

    const video = document.createElement("video");
    const timeout = window.setTimeout(() => resolve(false), 10000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    video.src = url;
  });
}

export function ArticleEditor({ article, articles = [], initialCategory }: { article?: Article | null; articles?: Article[]; initialCategory?: string }) {
  const router = useRouter();
  const translationEnvelope = useMemo(() => readTranslationEnvelope(article?.content), [article?.content]);
  const originalTranslation = translationEnvelope?.translations?.[translationEnvelope.originalLanguage ?? "es"];
  const originalContent = originalTranslation?.content ?? article?.content;
  const [state, formAction, pending] = useActionState(saveArticleAction, initialState);
  const [clientMessage, setClientMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savedId, setSavedId] = useState(article?.id ?? "");
  const [title, setTitle] = useState(inlineToHtml(originalTranslation?.title ?? article?.title ?? ""));
  const [excerpt, setExcerpt] = useState(inlineToHtml(originalTranslation?.excerpt ?? article?.excerpt ?? ""));
  const titleText = useMemo(() => htmlToText(title), [title]);
  const excerptText = useMemo(() => htmlToText(excerpt), [excerpt]);
  const generatedSlug = useMemo(() => slugify(titleText), [titleText]);
  const [slug, setSlug] = useState(article?.slug ?? generatedSlug);
  const [cover, setCover] = useState(article?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState(article?.coverImage ?? "");
  const [statusValue, setStatusValue] = useState(article?.status ?? "draft");
  const [category, setCategory] = useState(article?.category && EDITOR_CATEGORIES.includes(article.category) ? article.category : initialCategory && EDITOR_CATEGORIES.includes(initialCategory) ? initialCategory : "Vida");
  const [readTime, setReadTime] = useState(article?.readTime ?? "5 min leer");
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const initialEditorContent = useMemo(() => legacyContentToHtml(originalContent), [originalContent]);
  const initialDocumentPages = useMemo(() => initialEditorContent.split(/<hr\s*\/?>/i), [initialEditorContent]);
  const [editorHtml, setEditorHtml] = useState(initialDocumentPages[0] || "<p></p>");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localSave, setLocalSave] = useState("Autosave local listo");
  const [serverSave, setServerSave] = useState("Guardado");
  const [linkModal, setLinkModal] = useState({ open: false, title: "", url: "", newTab: true });
  const [spotifyModal, setSpotifyModal] = useState({ open: false, pos: -1, title: "", url: "" });
  const [spotifyCreateModal, setSpotifyCreateModal] = useState({ open: false, title: "Contenido de Spotify", url: "" });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const [lineHeightOpen, setLineHeightOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertView, setInsertView] = useState<"main" | "image" | "video">("main");
  const [mediaContext, setMediaContext] = useState({ open: false, x: 0, y: 0, pos: null as number | null });
  const [mediaCaptionPanel, setMediaCaptionPanel] = useState({ open: false, x: 0, y: 0, width: 320, pos: null as number | null });
  const [cropOpen, setCropOpen] = useState(false);
  const [mediaUrlModal, setMediaUrlModal] = useState({ open: false, kind: "image" as "image" | "video", title: "", url: "" });
  const [captionFocusTick, setCaptionFocusTick] = useState(0);
  const [hexColor, setHexColor] = useState("#7B3DFF");
  const [zoom, setZoom] = useState(100);
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>("magazineVertical");
  const [extraPages, setExtraPages] = useState<string[]>(initialDocumentPages.slice(1));
  const [activePanel, setActivePanel] = useState<"content" | "design">("content");
  const [selectedKind, setSelectedKind] = useState<"text" | "image" | "video" | null>(null);
  const [selectedMediaPos, setSelectedMediaPos] = useState<number | null>(null);
  const [selectedCollage, setSelectedCollage] = useState<{ pos: number; slot: number } | null>(null);
  const [lastSelectedImage, setLastSelectedImage] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaObjectPosition, setMediaObjectPosition] = useState("50% 50%");
  const [mediaAspectRatio, setMediaAspectRatio] = useState("");
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [activeEditor, setActiveEditor] = useState<TiptapEditor | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const collageInputRef = useRef<HTMLInputElement | null>(null);
  const captionInputRef = useRef<HTMLInputElement | null>(null);
  const captionPanelInputRef = useRef<HTMLInputElement | null>(null);
  const insertMenuRef = useRef<HTMLDivElement | null>(null);
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
        const collageSlot = (event.target as HTMLElement).closest("[data-collage-slot]") as HTMLElement | null;
        if (collageSlot) {
          const collage = collageSlot.closest("figure[data-editorial-collage]");
          if (collage) {
            const pos = view.posAtDOM(collage, 0);
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
            setSelectedCollage({ pos, slot: Number(collageSlot.dataset.collageSlot ?? 0) });
            setActivePanel("design");
            return true;
          }
        }

        const target = (event.target as HTMLElement).closest("a[data-spotify-card]") as HTMLAnchorElement | null;
        if (target) {
          event.preventDefault();
          setSpotifyModal({
            open: true,
            pos: view.posAtDOM(target, 0),
            title: target.dataset.title || target.textContent || "Contenido de Spotify",
            url: target.href,
          });
          return true;
        }

        const media = (event.target as HTMLElement).closest("figure[data-media-type], img, video") as HTMLElement | null;
        if (!media) return false;
        const pos = view.posAtDOM(media.closest("figure") ?? media, 0);
        const node = view.state.doc.nodeAt(pos);
        if (node?.type.name === "image" || node?.type.name === "videoEmbed") {
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
          setSelectedMediaPos(pos);
          setActiveEditor(editor);
          setMediaContext({ open: false, x: 0, y: 0, pos: null });
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu(view, event) {
          const media = (event.target as HTMLElement).closest("figure[data-media-type], img, video") as HTMLElement | null;
          if (!media) return false;
          const mouseEvent = event as MouseEvent;
          event.preventDefault();
          const pos = view.posAtDOM(media.closest("figure") ?? media, 0);
          const node = view.state.doc.nodeAt(pos);
          if (node?.type.name === "image" || node?.type.name === "videoEmbed") {
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
            setSelectedMediaPos(pos);
          }
          setMediaContext({ open: true, x: mouseEvent.clientX, y: mouseEvent.clientY, pos });
          setActiveEditor(editor);
          return true;
        },
        mouseup(view) {
          const selection = view.state.selection;
          if (!(selection instanceof NodeSelection)) return false;
          const nodeName = selection.node.type.name;
          if (nodeName !== "image" && nodeName !== "videoEmbed") return false;
          const dom = view.nodeDOM(selection.from);
          if (!(dom instanceof HTMLElement) || !dom.matches("figure[data-media-type]")) return false;
          const nextWidth = `${Math.round(dom.getBoundingClientRect().width)}px`;
          const currentWidth = String(selection.node.attrs.width ?? "");
          if (nextWidth !== currentWidth) {
            editor?.chain().focus().updateAttributes(nodeName, { width: nextWidth }).run();
          }
          return false;
        },
        keydown(view, event) {
          const keyboardEvent = event as KeyboardEvent;
          const selection = view.state.selection;
          if (!(selection instanceof NodeSelection)) return false;
          const nodeName = selection.node.type.name;
          if (nodeName !== "image" && nodeName !== "videoEmbed") return false;

          if (keyboardEvent.key === "Delete" || keyboardEvent.key === "Backspace") {
            event.preventDefault();
            view.dispatch(view.state.tr.deleteSelection().scrollIntoView());
            setMediaContext({ open: false, x: 0, y: 0, pos: null });
            setMediaCaptionPanel({ open: false, x: 0, y: 0, width: 320, pos: null });
            setSelectedKind(null);
            setSelectedMediaPos(null);
            return true;
          }

          if (keyboardEvent.key === "Escape") {
            event.preventDefault();
            setMediaContext({ open: false, x: 0, y: 0, pos: null });
            setMediaCaptionPanel({ open: false, x: 0, y: 0, width: 320, pos: null });
            setCropOpen(false);
            return true;
          }

          if (keyboardEvent.key === "Enter") {
            event.preventDefault();
            editor?.chain().focus().insertContentAt(selection.to, { type: "paragraph" }).run();
            return true;
          }

          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(keyboardEvent.key)) {
            event.preventDefault();
            const currentWidth = Number.parseInt(String(selection.node.attrs.width ?? MEDIA_SIZES.medium).replace(/\D/g, ""), 10) || 640;
            const delta = keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowUp" ? -10 : 10;
            const nextWidth = `${Math.max(220, currentWidth + delta)}px`;
            editor?.chain().focus().updateAttributes(nodeName, { width: nextWidth }).run();
            return true;
          }

          return false;
        },
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
        const attrs = currentEditor.getAttributes("image");
        if (currentEditor.state.selection instanceof NodeSelection) setSelectedMediaPos(currentEditor.state.selection.from);
        setSelectedKind("image");
        setLastSelectedImage(image);
        setMediaCaption(String(attrs.caption ?? ""));
        setMediaObjectPosition(String(attrs.objectPosition ?? "50% 50%"));
        setMediaAspectRatio(String(attrs.aspectRatio ?? ""));
      } else if (video) {
        const attrs = currentEditor.getAttributes("videoEmbed");
        if (currentEditor.state.selection instanceof NodeSelection) setSelectedMediaPos(currentEditor.state.selection.from);
        setSelectedKind("video");
        setMediaCaption(String(attrs.caption ?? ""));
        setMediaObjectPosition(String(attrs.objectPosition ?? "50% 50%"));
        setMediaAspectRatio(String(attrs.aspectRatio ?? "16 / 9"));
      } else if (!currentEditor.state.selection.empty) {
        setSelectedKind("text");
        setSelectedMediaPos(null);
      } else {
        setSelectedKind(null);
        setSelectedMediaPos(null);
        setMediaCaptionPanel((current) => current.open ? { open: false, x: 0, y: 0, width: 320, pos: null } : current);
      }
    },
  });

  const combinedEditorHtml = useMemo(
    () => [editorHtml, ...extraPages.map((pageHtml) => `<hr>${pageHtml}`)].join(""),
    [editorHtml, extraPages],
  );
  const contentJson = useMemo(
    () => preserveTranslationEnvelope(article?.content, title, excerpt, htmlToEditorialJson(combinedEditorHtml)),
    [article?.content, combinedEditorHtml, excerpt, title],
  );
  const characterCount = useMemo(() => htmlToText(combinedEditorHtml).length, [combinedEditorHtml]);
  const overLimit = characterCount > LIMIT;
  const viewSlug = state.slug ?? slug;
  const storageKey = `off-editor-${savedId || slug || "new"}`;

  useEffect(() => {
    if (state.articleId) setSavedId(state.articleId);
    if (state.slug) setSlug(state.slug);
    if (state.status) setStatusValue(state.status);
  }, [state.articleId, state.slug, state.status]);

  useEffect(() => {
    if (!state.ok) return;
    setHasUnsavedChanges(false);
    if (state.status !== "published") return;

    const timeout = window.setTimeout(() => router.replace("/admin"), 900);
    return () => window.clearTimeout(timeout);
  }, [router, state.ok, state.status]);

  useEffect(() => {
    setLeftRailCollapsed(window.localStorage.getItem("off-editor-left-collapsed") === "true");
    setRightRailCollapsed(window.localStorage.getItem("off-editor-right-collapsed") === "true");
    const storedZoom = Number(window.localStorage.getItem("off-editor-zoom"));
    if (ZOOM_LEVELS.includes(storedZoom)) setZoom(storedZoom);
    const storedPageSize = window.localStorage.getItem("off-editor-page-size") as keyof typeof PAGE_SIZES | null;
    if (storedPageSize && storedPageSize in PAGE_SIZES) setPageSize(storedPageSize);
  }, []);

  useEffect(() => {
    if (!insertOpen) return;

    function closeInsertMenu(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && insertMenuRef.current?.contains(event.target as Node)) return;
      setInsertOpen(false);
      setInsertView("main");
    }

    document.addEventListener("mousedown", closeInsertMenu);
    document.addEventListener("keydown", closeInsertMenu);
    return () => {
      document.removeEventListener("mousedown", closeInsertMenu);
      document.removeEventListener("keydown", closeInsertMenu);
    };
  }, [insertOpen]);

  useEffect(() => {
    if (!mediaContext.open || mediaContext.pos === null || !editor) return;

    function updateMenuPosition() {
      if (!editor || mediaContext.pos === null) return;
      const dom = editor.view.nodeDOM(mediaContext.pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      const menuWidth = 260;
      const left = Math.min(Math.max(16, rect.right + 12), window.innerWidth - menuWidth - 16);
      const top = Math.min(Math.max(16, rect.top + 8), window.innerHeight - 280);
      setMediaContext((current) => current.open ? { ...current, x: left, y: top } : current);
    }

    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [editor, mediaContext.open, mediaContext.pos]);

  useEffect(() => {
    if (!mediaCaptionPanel.open || mediaCaptionPanel.pos === null || !editor) return;

    function updateCaptionPosition() {
      if (!editor || mediaCaptionPanel.pos === null) return;
      const dom = editor.view.nodeDOM(mediaCaptionPanel.pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      const width = Math.min(Math.max(260, rect.width), window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
      const top = Math.min(Math.max(16, rect.bottom + 10), window.innerHeight - 90);
      setMediaCaptionPanel((current) => current.open ? { ...current, x: left, y: top, width } : current);
    }

    updateCaptionPosition();
    window.addEventListener("scroll", updateCaptionPosition, true);
    window.addEventListener("resize", updateCaptionPosition);
    return () => {
      window.removeEventListener("scroll", updateCaptionPosition, true);
      window.removeEventListener("resize", updateCaptionPosition);
    };
  }, [editor, mediaCaptionPanel.open, mediaCaptionPanel.pos]);

  useEffect(() => {
    if (captionFocusTick > 0) (captionPanelInputRef.current ?? captionInputRef.current)?.focus();
  }, [captionFocusTick]);

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
    setHasUnsavedChanges(true);
    setLocalSave("Guardando local...");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ title, excerpt, slug, cover, editorHtml: combinedEditorHtml, updatedAt: new Date().toISOString() }));
      setLocalSave("Guardado local");
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [combinedEditorHtml, cover, excerpt, slug, storageKey, title]);

  useEffect(() => {
    const readableText = htmlToText(combinedEditorHtml).trim();
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
        setHasUnsavedChanges(false);
      } else {
        setServerSave("Error al guardar");
      }
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [category, combinedEditorHtml, contentJson, cover, excerpt, excerptText, featured, overLimit, readTime, savedId, slug, statusValue, title, titleText, uploading]);

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

  function insertCollage(templateId: string, slots: number) {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: "editorialCollage",
      attrs: {
        template: templateId,
        images: Array.from({ length: slots }, () => ({ src: "", alt: "Imagen de collage" })),
        caption: "",
      },
    }).run();
    setEditorHtml(editor.getHTML());
  }

  function updateCollageSlot(src: string) {
    if (!editor || !selectedCollage) return;
    const node = editor.state.doc.nodeAt(selectedCollage.pos);
    if (!node || node.type.name !== "editorialCollage") return;
    const images = [...(Array.isArray(node.attrs.images) ? node.attrs.images : [])];
    images[selectedCollage.slot] = { src, alt: `Imagen ${selectedCollage.slot + 1} del collage` };
    const transaction = editor.state.tr.setNodeMarkup(selectedCollage.pos, undefined, { ...node.attrs, images });
    editor.view.dispatch(transaction);
    setEditorHtml(editor.getHTML());
  }

  async function handleCollageFile(file?: File) {
    if (!file || !selectedCollage) return;
    setUploading(true);
    try {
      updateCollageSlot(await uploadEditorFile(file));
      setClientMessage("");
    } catch (error) {
      setClientMessage(error instanceof Error ? error.message : "No se pudo subir la imagen del collage.");
    } finally {
      setUploading(false);
    }
  }

  function updateCollageCaption(caption: string) {
    if (!editor || !selectedCollage) return;
    const node = editor.state.doc.nodeAt(selectedCollage.pos);
    if (!node || node.type.name !== "editorialCollage") return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selectedCollage.pos, undefined, { ...node.attrs, caption }));
    setEditorHtml(editor.getHTML());
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

  function openGeneralLinkFromInsert() {
    if (!editor) return;
    const range = bodySelectionRef.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
    const selectedTitle = editor.state.doc.textBetween(range.from, range.to, " ").trim();
    editor.chain().focus().setTextSelection(range).run();
    setActiveEditor(editor);
    setInsertOpen(false);
    setInsertView("main");
    setLinkModal({ open: true, title: selectedTitle, url: "", newTab: true });
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
    if (!isSafeMediaUrl("image", url)) {
      setClientMessage("Pega una URL valida para el enlace.");
      return;
    }

    const { from, to } = targetEditor.state.selection;
    const selectedTitle = targetEditor.state.doc.textBetween(from, to, " ").trim();
    const label = title || selectedTitle || "Link";
    targetEditor.chain().focus().insertContentAt({ from, to }, `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(label)}</a>`).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setLinkModal({ open: false, title: "", url: "", newTab: true });
    setClientMessage("");
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

  function applyTextStyleToSelectionOrBlock(attributes: Record<string, string | null>) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;

    const { from, to, empty, $from } = targetEditor.state.selection;
    const range = empty
      ? { from: $from.start(), to: $from.end() }
      : { from, to };
    const chain = targetEditor
      .chain()
      .focus()
      .setTextSelection(range)
      .setMark("textStyle", attributes)
      .setTextSelection({ from, to });

    if (empty) chain.setMark("textStyle", attributes);
    chain.run();

    if (targetEditor === editor) setEditorHtml(targetEditor.getHTML());
  }

  function applyLineHeight(lineHeight: string) {
    applyTextStyleToSelectionOrBlock({ lineHeight });
    setLineHeightOpen(false);
  }

  function applyHeadingToken(token: string) {
    const targetEditor = currentEditor();
    if (!targetEditor) return;
    const style = HEADING_TOKENS[token as keyof typeof HEADING_TOKENS];
    if (!style) return;
    if (token === "H1") targetEditor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (token === "H2") targetEditor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (token === "H3") targetEditor.chain().focus().toggleHeading({ level: 3 }).run();
    applyTextStyleToSelectionOrBlock(style);
    setHeadingOpen(false);
  }

  function applyImageLayout(layout: "center" | "left" | "right" | "full") {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { layout }).run();
    setEditorHtml(editor.getHTML());
  }

  function selectedMediaType() {
    if (!editor) return null;
    const selection = editor.state.selection;
    if (selection instanceof NodeSelection && selection.node.type.name === "image") return "image";
    if (selection instanceof NodeSelection && selection.node.type.name === "videoEmbed") return "videoEmbed";
    if (selectedKind === "image") return "image";
    if (selectedKind === "video") return "videoEmbed";
    return null;
  }

  function updateSelectedMedia(attrs: Record<string, unknown>, options: { focus?: boolean } = {}) {
    if (!editor) return;
    const shouldFocus = options.focus ?? true;
    const type = selectedMediaType();
    if (!type) return;
    const pos = selectedMediaPos;
    const node = pos !== null ? editor.state.doc.nodeAt(pos) : null;
    if (pos !== null && node?.type.name === type) {
      const tr = editor.state.tr;
      const current = tr.doc.nodeAt(pos);
      if (!current || current.type.name !== type) return;
      tr.setNodeMarkup(pos, undefined, { ...current.attrs, ...attrs });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
      editor.view.dispatch(tr);
      if (shouldFocus) editor.view.focus();
    } else {
      const chain = shouldFocus ? editor.chain().focus() : editor.chain();
      chain.updateAttributes(type, attrs).run();
    }
    setEditorHtml(editor.getHTML());
  }

  function applyMediaSize(size: keyof typeof MEDIA_SIZES) {
    const attrs = { width: MEDIA_SIZES[size], size: size === "full" ? "large" : size };
    updateSelectedMedia(attrs);
  }

  function applyMediaLayout(layout: "center" | "left" | "right" | "full") {
    updateSelectedMedia({ layout, width: layout === "full" ? MEDIA_SIZES.full : undefined });
  }

  function moveSelectedMedia(direction: "above" | "below") {
    if (!editor || selectedMediaPos === null) return;
    const pos = selectedMediaPos;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || (node.type.name !== "image" && node.type.name !== "videoEmbed")) return;

    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        const current = tr.doc.nodeAt(pos);
        if (!current || current.type.name !== node.type.name) return false;
        const resolved = tr.doc.resolve(pos);
        const parent = resolved.parent;
        const index = resolved.index();
        let insertAt = pos;

        if (direction === "above") {
          if (index <= 0) return false;
          const previous = parent.child(index - 1);
          insertAt = pos - previous.nodeSize;
        } else {
          if (index >= parent.childCount - 1) return false;
          const next = parent.child(index + 1);
          insertAt = pos + current.nodeSize + next.nodeSize;
        }

        tr.delete(pos, pos + current.nodeSize);
        const adjustedInsertAt = direction === "below" ? insertAt - current.nodeSize : insertAt;
        tr.insert(adjustedInsertAt, current.copy(current.content));
        tr.setSelection(NodeSelection.create(tr.doc, adjustedInsertAt));
        if (dispatch) dispatch(tr.scrollIntoView());
        setSelectedMediaPos(adjustedInsertAt);
        return true;
      })
      .run();
    setEditorHtml(editor.getHTML());
  }

  function applyMediaPosition(position: (typeof MEDIA_POSITION_OPTIONS)[number]["value"]) {
    if (position === "above") {
      updateSelectedMedia({ layout: "center", wrapMode: "top-bottom" });
      moveSelectedMedia("above");
      return;
    }
    if (position === "below") {
      updateSelectedMedia({ layout: "center", wrapMode: "top-bottom" });
      moveSelectedMedia("below");
      return;
    }
    if (position === "left") {
      updateSelectedMedia({ layout: "left", wrapMode: "square", width: MEDIA_SIZES.medium });
      return;
    }
    if (position === "right") {
      updateSelectedMedia({ layout: "right", wrapMode: "square", width: MEDIA_SIZES.medium });
      return;
    }
    if (position === "center") {
      updateSelectedMedia({ layout: "center", wrapMode: "top-bottom", width: MEDIA_SIZES.large });
      return;
    }
    updateSelectedMedia({ layout: "left", wrapMode: "square", width: MEDIA_SIZES.medium });
  }

  function applyWrapMode(wrapMode: string) {
    updateSelectedMedia({ wrapMode });
  }

  function applyMediaCaption(caption: string) {
    setMediaCaption(caption);
    updateSelectedMedia({ caption }, { focus: false });
  }

  function openCaptionEditor() {
    const pos = selectedMediaPos ?? mediaContext.pos;
    if (pos === null) return;
    setMediaCaptionPanel((current) => ({ ...current, open: true, pos }));
    setMediaContext({ open: false, x: 0, y: 0, pos: null });
    setCaptionFocusTick((tick) => tick + 1);
  }

  function applyCrop(next: { objectPosition?: string; aspectRatio?: string; objectFit?: string }) {
    if (next.objectPosition !== undefined) setMediaObjectPosition(next.objectPosition);
    if (next.aspectRatio !== undefined) setMediaAspectRatio(next.aspectRatio);
    updateSelectedMedia(next);
  }

  function applyImageWidth(width: string) {
    if (!editor) return;
    updateSelectedMedia({ width });
  }

  function applyVideoSize(size: "small" | "medium" | "large") {
    if (!editor) return;
    updateSelectedMedia({ size, width: MEDIA_SIZES[size] });
  }

  function openSpotifyCreate() {
    setInsertOpen(false);
    setInsertView("main");
    setSpotifyCreateModal({ open: true, title: "Contenido de Spotify", url: "" });
  }

  function openMediaUrlModal(kind: "image" | "video") {
    if (editor) bodySelectionRef.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    setInsertOpen(false);
    setInsertView("main");
    setMediaUrlModal({ open: true, kind, title: "", url: "" });
  }

  async function confirmMediaUrl() {
    if (!editor) return;
    const url = mediaUrlModal.url.trim();
    if (!isSafeMediaUrl(mediaUrlModal.kind, url)) {
      setClientMessage("Pega una URL valida de imagen o video.");
      return;
    }
    setClientMessage("Validando enlace...");
    const validMedia = await canLoadRemoteMedia(mediaUrlModal.kind, url);
    if (!validMedia) {
      setClientMessage(mediaUrlModal.kind === "image" ? "La URL no contiene una imagen valida." : "La URL no contiene un video reproducible.");
      return;
    }
    const range = bodySelectionRef.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
    const title = mediaUrlModal.title.trim();
    const inserted = mediaUrlModal.kind === "video"
      ? insertMediaNode(editor, "videoEmbed", { src: url, caption: title, size: "medium", layout: "center", width: MEDIA_SIZES.medium }, range)
      : insertMediaNode(editor, "image", { src: url, alt: title || "Imagen editorial", caption: title, layout: "center", width: MEDIA_SIZES.large }, range);
    if (!inserted) {
      setClientMessage("No se pudo insertar la URL en la hoja.");
      return;
    }
    setEditorHtml(editor.getHTML());
    setMediaUrlModal({ open: false, kind: "image", title: "", url: "" });
    setClientMessage("");
  }

  function confirmSpotifyCreate() {
    const targetEditor = currentEditor();
    const url = spotifyCreateModal.url.trim();
    if (!targetEditor || !url) return;
    if (!/^https?:\/\/(open\.)?spotify\.com\//i.test(url)) {
      setClientMessage("Pega un enlace válido de Spotify.");
      return;
    }
    targetEditor.chain().focus().insertContent({
      type: "spotifyEmbed",
      attrs: { url, title: spotifyCreateModal.title.trim() || "Contenido de Spotify" },
    }).run();
    if (targetEditor === editor) setEditorHtml(editor.getHTML());
    setSpotifyCreateModal({ open: false, title: "Contenido de Spotify", url: "" });
    setClientMessage("");
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
    setExtraPages((current) => [...current, "<p></p>"]);
  }

  function removePage() {
    setExtraPages((current) => current.slice(0, -1));
  }

  const toolbarEditor = activeEditor ?? editor;
  const canUseToolbar = Boolean(toolbarEditor);
  const activeTextStyle = toolbarEditor?.getAttributes("textStyle") ?? {};
  const activeFont = EDITOR_FONTS.find((font) => activeTextStyle.fontFamily === font.family);
  const activeLineHeight = String(activeTextStyle.lineHeight ?? "");
  const activeHeadingToken = toolbarEditor?.isActive("heading", { level: 1 })
    ? "H1"
    : toolbarEditor?.isActive("heading", { level: 2 })
      ? "H2"
      : toolbarEditor?.isActive("heading", { level: 3 })
        ? "H3"
        : "";
  const page = PAGE_SIZES[pageSize];

  function returnToAdmin() {
    if (hasUnsavedChanges && !window.confirm("Tienes cambios recientes. ¿Quieres regresar al dashboard sin esperar otro guardado?")) return;
    router.push("/admin");
  }

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
          <LanguageSwitcher compact />
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
              <button type="button" className="button" onClick={confirmLink}>Insertar</button>
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

      {spotifyCreateModal.open ? (
        <div className="link-modal-backdrop" role="dialog" aria-modal="true" aria-label="Insertar Spotify">
          <div className="link-modal spotify-edit-modal">
            <strong>Insertar Spotify</strong>
            <label>
              Título del enlace
              <input value={spotifyCreateModal.title} onChange={(event) => setSpotifyCreateModal((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              URL
              <input autoFocus value={spotifyCreateModal.url} onChange={(event) => setSpotifyCreateModal((current) => ({ ...current, url: event.target.value }))} placeholder="https://open.spotify.com/..." />
            </label>
            <div className="link-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setSpotifyCreateModal({ open: false, title: "Contenido de Spotify", url: "" })}>Cancelar</button>
              <button type="button" className="button" onClick={confirmSpotifyCreate}>Insertar</button>
            </div>
          </div>
        </div>
      ) : null}

      {mediaUrlModal.open ? (
        <div className="link-modal-backdrop" role="dialog" aria-modal="true" aria-label={mediaUrlModal.kind === "image" ? "Insertar imagen desde URL" : "Insertar video desde URL"}>
          <div className="link-modal">
            <strong>{mediaUrlModal.kind === "image" ? "Insertar imagen por enlace" : "Insertar video por enlace"}</strong>
            <label>
              {mediaUrlModal.kind === "image" ? "Título de imagen" : "Título de video"}
              <input
                value={mediaUrlModal.title}
                onChange={(event) => setMediaUrlModal((current) => ({ ...current, title: event.target.value }))}
                placeholder={mediaUrlModal.kind === "image" ? "Imagen editorial" : "Video editorial"}
              />
            </label>
            <label>
              URL
              <input
                autoFocus
                value={mediaUrlModal.url}
                onChange={(event) => setMediaUrlModal((current) => ({ ...current, url: event.target.value }))}
                placeholder={mediaUrlModal.kind === "image" ? "https://.../imagen.webp" : "https://.../video.mp4"}
              />
            </label>
            <div className="link-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setMediaUrlModal({ open: false, kind: "image", title: "", url: "" })}>Cancelar</button>
              <button type="button" className="button" onClick={() => void confirmMediaUrl()}>Insertar</button>
            </div>
          </div>
        </div>
      ) : null}

      {mediaContext.open ? (
        <div className="media-context-menu" style={{ left: mediaContext.x, top: mediaContext.y }}>
          <button type="button" onClick={() => { setCropOpen(true); setMediaContext({ open: false, x: 0, y: 0, pos: null }); }}>Recortar</button>
          <div className="media-context-submenu">
            <span>Posición</span>
            {MEDIA_POSITION_OPTIONS.map((mode) => (
              <button type="button" key={mode.value} onClick={() => { applyMediaPosition(mode.value); setMediaContext({ open: false, x: 0, y: 0, pos: null }); }}>{mode.label}</button>
            ))}
          </div>
          <div className="media-context-submenu">
            <span>Ajustar imagen/video</span>
            {WRAP_MODES.map((mode) => (
              <button type="button" key={mode.value} onClick={() => { applyWrapMode(mode.value); setMediaContext({ open: false, x: 0, y: 0, pos: null }); }}>{mode.label}</button>
            ))}
          </div>
          <button type="button" onClick={openCaptionEditor}>Pie de foto</button>
        </div>
      ) : null}

      {mediaCaptionPanel.open ? (
        <div className="media-caption-panel" style={{ left: mediaCaptionPanel.x, top: mediaCaptionPanel.y, width: mediaCaptionPanel.width }}>
          <label>
            Pie de foto
            <input
              ref={captionPanelInputRef}
              value={mediaCaption}
              onChange={(event) => applyMediaCaption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setMediaCaptionPanel({ open: false, x: 0, y: 0, width: 320, pos: null });
              }}
              placeholder="Escribe un caption..."
            />
          </label>
          <button type="button" onClick={() => setMediaCaptionPanel({ open: false, x: 0, y: 0, width: 320, pos: null })}>Listo</button>
        </div>
      ) : null}

      {cropOpen ? (
        <div className="link-modal-backdrop" role="dialog" aria-modal="true" aria-label="Recortar media">
          <div className="link-modal crop-modal">
            <strong>Recorte visual</strong>
            <label>
              Aspect ratio
              <select value={mediaAspectRatio} onChange={(event) => applyCrop({ aspectRatio: event.target.value })}>
                {ASPECT_RATIOS.map((ratio) => <option value={ratio.value} key={ratio.label}>{ratio.label}</option>)}
              </select>
            </label>
            <label>
              Posición horizontal
              <input type="range" min="0" max="100" value={Number.parseInt(mediaObjectPosition.split(" ")[0] || "50", 10)} onChange={(event) => applyCrop({ objectPosition: `${event.target.value}% ${mediaObjectPosition.split(" ")[1] || "50%"}` })} />
            </label>
            <label>
              Posición vertical
              <input type="range" min="0" max="100" value={Number.parseInt(mediaObjectPosition.split(" ")[1] || "50", 10)} onChange={(event) => applyCrop({ objectPosition: `${mediaObjectPosition.split(" ")[0] || "50%"} ${event.target.value}%` })} />
            </label>
            <div className="design-button-row">
              <button type="button" onClick={() => applyCrop({ objectFit: "cover" })}>Recortar</button>
              <button type="button" onClick={() => applyCrop({ objectFit: "contain" })}>Ajustar completo</button>
            </div>
            <div className="link-modal-actions">
              <button type="button" className="button" onClick={() => setCropOpen(false)}>Listo</button>
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
              <button type="button" title="Párrafo" aria-label="Párrafo" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().setParagraph().run()}>
                <Pilcrow aria-hidden="true" />
              </button>
              <div className="toolbar-dropdown font-dropdown">
                <button className={activeFont ? "active" : ""} type="button" title="Tipografías" aria-label="Tipografías" disabled={!canUseToolbar} onClick={() => setFontOpen((open) => !open)}>{activeFont?.label ?? "Tipografías"}</button>
                {fontOpen ? (
                  <div className="toolbar-menu font-menu">
                    {EDITOR_FONTS.map((font) => (
                      <button
                        type="button"
                        key={font.label}
                        className={activeFont?.label === font.label ? "active" : ""}
                        onClick={() => applyFont(font)}
                        style={{ fontFamily: font.family, fontVariationSettings: font.variation }}
                      >
                        <span>{activeFont?.label === font.label ? "✓" : ""}</span>{font.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="toolbar-dropdown">
                <button className={activeHeadingToken ? "active" : ""} type="button" title="Tamaño de título" aria-label="Tamaño de título" disabled={!canUseToolbar} onClick={() => setHeadingOpen((open) => !open)}>{activeHeadingToken || "HT"}</button>
                {headingOpen ? (
                  <div className="toolbar-menu">
                    {Object.keys(HEADING_TOKENS).map((token) => (
                      <button className={activeHeadingToken === token ? "active" : ""} type="button" key={token} onClick={() => applyHeadingToken(token)}>{token}</button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="toolbar-dropdown line-height-dropdown">
                <button
                  type="button"
                  title="Interlineado"
                  aria-label="Interlineado"
                  aria-expanded={lineHeightOpen}
                  className={activeLineHeight ? "active" : ""}
                  disabled={!canUseToolbar}
                  onClick={() => setLineHeightOpen((open) => !open)}
                >
                  <AlignVerticalSpaceAround aria-hidden="true" />
                </button>
                {lineHeightOpen ? (
                  <div className="toolbar-menu line-height-menu" aria-label="Interlineado">
                    <span>Interlineado</span>
                    {LINE_HEIGHT_OPTIONS.map((value) => (
                      <button type="button" key={value} onClick={() => applyLineHeight(value)}>
                        {activeLineHeight === value ? "✓ " : ""}{Number(value).toFixed(1)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" title="Cita" aria-label="Cita" className={toolbarEditor?.isActive("blockquote") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBlockquote().run()}>
                <Quote aria-hidden="true" />
              </button>
            </div>
            <div className="doc-toolbar-group">
              <button type="button" title="Negrita" aria-label="Negrita" className={toolbarEditor?.isActive("bold") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBold().run()}><Bold aria-hidden="true" /></button>
              <button type="button" title="Cursiva" aria-label="Cursiva" className={toolbarEditor?.isActive("italic") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" /></button>
              <button type="button" title="Subrayado" aria-label="Subrayado" className={toolbarEditor?.isActive("underline") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleUnderline().run()}><UnderlineIcon aria-hidden="true" /></button>
              <button type="button" title="Tachado" aria-label="Tachado" className={toolbarEditor?.isActive("strike") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleStrike().run()}><Strikethrough aria-hidden="true" /></button>
              <button type="button" title="Resaltar" aria-label="Resaltar" className={toolbarEditor?.isActive("highlight") ? "active" : ""} disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleHighlight({ color: "#7b3dff55" }).run()}><Highlighter aria-hidden="true" /></button>
              <button type="button" title="Enlace" aria-label="Enlace" className={toolbarEditor?.isActive("link") ? "active" : ""} disabled={!canUseToolbar} onClick={applyLink}><LinkIcon aria-hidden="true" /></button>
            </div>
            <div className="doc-toolbar-group">
              <div className="palette-wrap">
                <button type="button" title="Paleta" aria-label="Paleta" disabled={!canUseToolbar} onClick={() => setPaletteOpen((open) => !open)}><Palette aria-hidden="true" /></button>
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
              <button type="button" title="Lista con viñetas" aria-label="Lista con viñetas" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleBulletList().run()}><List aria-hidden="true" /></button>
              <button type="button" title="Lista numerada" aria-label="Lista numerada" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().toggleOrderedList().run()}><ListOrdered aria-hidden="true" /></button>
              <button type="button" title="Separador" aria-label="Separador" disabled={!canUseToolbar} onClick={() => toolbarEditor?.chain().focus().setHorizontalRule().run()}><Minus aria-hidden="true" /></button>
              <div className="toolbar-dropdown insert-dropdown" ref={insertMenuRef}>
                <button
                  type="button"
                  title="Insertar"
                  aria-haspopup="menu"
                  aria-expanded={insertOpen}
                  disabled={!canUseToolbar || uploading}
                  onClick={() => {
                    setInsertOpen((open) => !open);
                    setInsertView("main");
                  }}
                >
                  <Plus aria-hidden="true" />
                  <span>Insertar</span>
                </button>
                {insertOpen ? (
                  <div className="insert-menu" role="menu" aria-label="Insertar">
                    <div className="insert-menu-heading">
                      {insertView === "main" ? "Insertar" : insertView === "image" ? "Imagen" : "Video"}
                    </div>
                    {insertView === "main" ? (
                      <div className="insert-menu-panel">
                        <button type="button" role="menuitem" onClick={() => setInsertView("image")}>Imagen</button>
                        <button type="button" role="menuitem" onClick={() => setInsertView("video")}>Video</button>
                        <button type="button" role="menuitem" onClick={openSpotifyCreate}>Spotify</button>
                        <button type="button" role="menuitem" onClick={openGeneralLinkFromInsert}>Enlace</button>
                      </div>
                    ) : (
                      <div className="insert-menu-panel">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setInsertOpen(false);
                            setInsertView("main");
                            if (insertView === "image") openImagePicker();
                            else openVideoPicker();
                          }}
                        >
                          Local
                        </button>
                        <button type="button" role="menuitem" onClick={() => openMediaUrlModal(insertView === "image" ? "image" : "video")}>
                          Enlace
                        </button>
                        <button type="button" role="menuitem" className="insert-back-button" onClick={() => setInsertView("main")}>
                          Volver
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <input ref={imageInputRef} hidden type="file" accept={IMAGE_ACCEPT} onChange={(event) => { void handleInlineImageFile(event.target.files?.[0]); event.target.value = ""; }} />
              <input ref={videoInputRef} hidden type="file" accept={VIDEO_ACCEPT} onChange={(event) => { void handleInlineImageFile(event.target.files?.[0]); event.target.value = ""; }} />
              <input ref={collageInputRef} hidden type="file" accept={IMAGE_ACCEPT} onChange={(event) => { void handleCollageFile(event.target.files?.[0]); event.target.value = ""; }} />
            </div>
            <div className="doc-toolbar-group page-toolbar-group">
              <select value={pageSize} onChange={(event) => changePageSize(event.target.value as keyof typeof PAGE_SIZES)} aria-label="Tamaño de hoja">
                {Object.entries(PAGE_SIZES).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}
              </select>
              <select value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Zoom">
                {ZOOM_LEVELS.map((level) => <option value={level} key={level}>{level}%</option>)}
              </select>
              <button type="button" onClick={addPage}>+ Hoja</button>
              <button type="button" disabled={extraPages.length === 0} onClick={removePage}>Eliminar hoja</button>
            </div>
            <div className="doc-toolbar-group doc-toolbar-return">
              <button type="button" onClick={returnToAdmin}>Regresar</button>
            </div>
          </nav>

          {selectedKind === "image" || selectedKind === "video" ? (
            <div className="media-selection-toolbar">
              <span>{selectedKind === "image" ? "Imagen seleccionada" : "Video seleccionado"}</span>
              <button type="button" onClick={() => applyMediaSize("small")}>Pequeño</button>
              <button type="button" onClick={() => applyMediaSize("medium")}>Mediano</button>
              <button type="button" onClick={() => applyMediaSize("large")}>Grande</button>
              <button type="button" onClick={() => applyMediaSize("full")}>Ancho completo</button>
              <button type="button" onClick={() => applyMediaLayout("left")}>Izquierda</button>
              <button type="button" onClick={() => applyMediaLayout("center")}>Centro</button>
              <button type="button" onClick={() => applyMediaLayout("right")}>Derecha</button>
              <button type="button" onClick={() => applyMediaPosition("above")}>Encima</button>
              <button type="button" onClick={() => applyMediaPosition("below")}>Debajo</button>
              <button type="button" onClick={() => applyMediaPosition("wrap")}>Ajustar texto</button>
              <label>
                Pie de foto
                <input ref={captionInputRef} value={mediaCaption} onChange={(event) => applyMediaCaption(event.target.value)} placeholder="Escribe un caption..." />
              </label>
            </div>
          ) : null}

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
              {extraPages.map((pageHtml, index) => (
                <motion.section
                  className="editor-paper-sheet editor-paper-sheet-extra"
                  style={{ "--page-width": `${page.width}px`, "--page-min-height": `${page.minHeight}px` } as CSSProperties}
                  key={`page-${index + 2}`}
                  initial={{ opacity: 0, y: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -18, scale: 0.96 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                >
                  <span className="paper-label">Hoja {index + 2}</span>
                  <div
                    className="extra-page-editor"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: pageHtml }}
                    onInput={(event) => {
                      const html = event.currentTarget.innerHTML;
                      setExtraPages((current) => current.map((page, pageIndex) => pageIndex === index ? html : page));
                    }}
                  />
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
                  {LINE_HEIGHT_OPTIONS.map((value) => <option value={value} key={value}>{Number(value).toFixed(1)}</option>)}
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
              <section className="collage-design-panel">
                <strong>Collage</strong>
                <p>Inserta una plantilla en la posición actual del cursor.</p>
                <div className="collage-template-grid">
                  {COLLAGE_TEMPLATES.map((template) => (
                    <button type="button" title={template.label} onClick={() => insertCollage(template.id, template.slots)} key={template.id}>
                      <span className={`collage-template-preview preview-${template.id}`} />
                      {template.label}
                    </button>
                  ))}
                </div>
                {selectedCollage ? (
                  <div className="collage-slot-controls">
                    <span>Cuadro {selectedCollage.slot + 1} seleccionado</span>
                    <button type="button" onClick={() => collageInputRef.current?.click()}>Subir imagen local</button>
                    <button type="button" onClick={() => {
                      const url = window.prompt("Pega la URL de la imagen");
                      if (url && isSafeMediaUrl("image", url)) updateCollageSlot(url);
                    }}>Pegar URL</button>
                    <button type="button" onClick={() => updateCollageSlot("")}>Eliminar imagen</button>
                    <label className="field">Caption del collage
                      <input onBlur={(event) => updateCollageCaption(event.target.value)} placeholder="Caption opcional" />
                    </label>
                  </div>
                ) : <p className="empty-dashboard-state">Selecciona un cuadro del collage para cambiar su imagen.</p>}
              </section>
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
            <div className="reader" dangerouslySetInnerHTML={{ __html: safePreviewHtml(combinedEditorHtml) }} />
          </section>
        </div>
      ) : null}
    </form>
  );
}



