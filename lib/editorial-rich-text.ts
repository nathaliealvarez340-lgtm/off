"use client";

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

type UploadFn = (file: File) => Promise<string>;

export type RichPasteOptions = {
  uploadFile?: UploadFn;
  onMessage?: (message: string) => void;
};

const SAFE_STYLE_PROPERTIES = new Set([
  "color",
  "background-color",
  "font-size",
  "line-height",
  "letter-spacing",
  "font-family",
  "font-variation-settings",
  "text-align",
  "vertical-align",
  "text-decoration",
]);

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "mark",
  "span",
  "sup",
  "sub",
  "a",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "pre",
  "code",
  "figure",
  "figcaption",
  "img",
  "video",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

function isSafeUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("#") || value.startsWith("mailto:");
}

function sanitizeStyle(value: string) {
  return value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [property, ...rawValue] = rule.split(":");
      const normalized = property?.trim().toLowerCase();
      const nextValue = rawValue.join(":").trim();
      if (!normalized || !SAFE_STYLE_PROPERTIES.has(normalized)) return "";
      if (/url\s*\(|expression\s*\(|javascript:/i.test(nextValue)) return "";
      return `${normalized}: ${nextValue}`;
    })
    .filter(Boolean)
    .join("; ");
}

export function lineHeightForFontSize(size: string) {
  const pixels = Number.parseFloat(size);
  if (!Number.isFinite(pixels)) return "1.35";
  if (pixels >= 48) return "1";
  if (pixels >= 38) return "1.08";
  if (pixels >= 30) return "1.14";
  if (pixels >= 24) return "1.2";
  if (pixels >= 18) return "1.35";
  return "1.42";
}

export const RichTextStyleAttributes = Extension.create({
  name: "richTextStyleAttributes",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}; line-height: ${attributes.lineHeight ?? lineHeightForFontSize(attributes.fontSize)};` } : {}),
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => (attributes.lineHeight && !attributes.fontSize ? { style: `line-height: ${attributes.lineHeight};` } : {}),
          },
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => (attributes.letterSpacing ? { style: `letter-spacing: ${attributes.letterSpacing};` } : {}),
          },
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily || null,
            renderHTML: (attributes) => (attributes.fontFamily ? { style: `font-family: ${attributes.fontFamily};` } : {}),
          },
          fontVariationSettings: {
            default: null,
            parseHTML: (element) => element.style.fontVariationSettings || null,
            renderHTML: (attributes) => (attributes.fontVariationSettings ? { style: `font-variation-settings: ${attributes.fontVariationSettings};` } : {}),
          },
        },
      },
    ];
  },
});

export function stripRichHtml(value = "") {
  if (typeof document === "undefined") return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const template = document.createElement("template");
  template.innerHTML = value.replace(/<br\s*\/?>/gi, "\n");
  return (template.content.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function sanitizeRichHtml(html: string) {
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("script, style, meta, link, iframe, object, embed").forEach((element) => element.remove());

  template.content.querySelectorAll("*").forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      const isDataAttr = name.startsWith("data-");
      const isSafeClass = name === "class" && /^(spotify-pill|spotify-pill-logo|spotify-pill-title|editorial-collage|editorial-collage-grid|collage-slot|editor-media-node|\s|-|[a-z0-9_])+$/i.test(value);
      const isMediaAttr = ["img", "video"].includes(tag) && ["src", "alt", "title", "controls", "width", "height"].includes(name);
      const isFigureAttr = tag === "figure" && ["style"].includes(name);
      const isLinkAttr = tag === "a" && ["href", "target", "rel"].includes(name);
      const isStyleAttr = name === "style";

      if (isStyleAttr) {
        const cleanStyle = sanitizeStyle(value);
        if (cleanStyle) element.setAttribute("style", cleanStyle);
        else element.removeAttribute(attribute.name);
        return;
      }

      if (!isDataAttr && !isSafeClass && !isMediaAttr && !isFigureAttr && !isLinkAttr) {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((name === "src" || name === "href") && !isSafeUrl(value) && !value.startsWith("blob:")) {
        element.removeAttribute(attribute.name);
      }
    });

    if (tag === "a") {
      const href = element.getAttribute("href") ?? "";
      if (!isSafeUrl(href)) element.removeAttribute("href");
      if (element.getAttribute("target") === "_blank") element.setAttribute("rel", "noreferrer");
    }
  });

  return template.innerHTML;
}

async function dataUrlToFile(dataUrl: string, index: number) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "png";
  return new File([blob], `pasted-image-${index}.${extension}`, { type: blob.type || "image/png" });
}

async function replaceBase64Images(html: string, uploadFile?: UploadFn) {
  if (!uploadFile || typeof document === "undefined") return html.replace(/<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi, "");
  const template = document.createElement("template");
  template.innerHTML = html;
  const images = Array.from(template.content.querySelectorAll("img[src^='data:image/']"));

  for (const [index, image] of images.entries()) {
    const source = image.getAttribute("src");
    if (!source) continue;
    const file = await dataUrlToFile(source, index + 1);
    const url = await uploadFile(file);
    image.setAttribute("src", url);
  }

  return template.innerHTML;
}

export const RichPaste = Extension.create<RichPasteOptions>({
  name: "richPaste",

  addOptions() {
    return {
      uploadFile: undefined,
      onMessage: undefined,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const files = Array.from(clipboard.files).filter((file) => file.type.startsWith("image/"));
            if (files.length > 0) {
              event.preventDefault();
              void (async () => {
                if (!options.uploadFile) {
                  options.onMessage?.("No se pudo pegar la imagen. Usa la herramienta de upload.");
                  return;
                }
                try {
                  for (const file of files) {
                    const url = await options.uploadFile(file);
                    editor.chain().focus().setImage({ src: url, alt: file.name || "Imagen editorial" }).run();
                  }
                  options.onMessage?.("");
                } catch {
                  options.onMessage?.("No se pudo pegar la imagen. Revisa formato o tamaño.");
                }
              })();
              return true;
            }

            const html = clipboard.getData("text/html");
            if (html) {
              event.preventDefault();
              void (async () => {
                try {
                  const withoutBase64 = await replaceBase64Images(html, options.uploadFile);
                  editor.chain().focus().insertContent(sanitizeRichHtml(withoutBase64)).run();
                  options.onMessage?.("");
                } catch {
                  options.onMessage?.("No se pudo pegar el contenido con formato.");
                }
              })();
              return true;
            }

            const text = clipboard.getData("text/plain");
            if (text) {
              event.preventDefault();
              editor.chain().focus().insertContent(plainTextToHtml(text)).run();
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
