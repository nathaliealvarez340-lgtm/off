"use client";

import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Highlighter, Italic, Link as LinkIcon, List, ListOrdered, Quote, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Underline as UnderlineIcon } from "lucide-react";
import { useRef, useState } from "react";
import { TypographySpacingControl } from "@/components/TypographySpacingControl";
import { useOffLanguage } from "@/components/useOffLanguage";
import { RichPaste, RichTextStyleAttributes, sanitizeRichHtml } from "@/lib/editorial-rich-text";

const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/tiff,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.svg";
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const result = await response.json().catch(() => null) as { success?: boolean; url?: string; error?: string } | null;
  if (!response.ok || !result?.success || !result.url) {
    throw new Error(result?.error || "No se pudo subir el archivo. Revisa formato o tamaño.");
  }
  return result.url;
}

export function EditorialRichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const { t } = useOffLanguage();
  const [message, setMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      RichTextStyleAttributes,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: false, inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: "noreferrer" } }),
      RichPaste.configure({ uploadFile, onMessage: setMessage }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: currentEditor }) => onChange(sanitizeRichHtml(currentEditor.getHTML())),
  });

  async function handleImage(file?: File) {
    if (!file || !editor) return;
    setMessage("Subiendo imagen...");
    try {
      const url = await uploadFile(file);
      editor.chain().focus().setImage({ src: url, alt: file.name || "Imagen editorial" }).run();
      onChange(sanitizeRichHtml(editor.getHTML()));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir el archivo. Revisa formato o tamaño.");
    }
  }

  if (!editor) return <div className="mini-rich-editor skeleton" />;

  return (
    <div className="mini-rich-editor">
      <div className="mini-rich-toolbar" aria-label="Herramientas editoriales">
        <button type="button" className={editor.isActive("bold") ? "active" : ""} title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()}><Bold aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("italic") ? "active" : ""} title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("underline") ? "active" : ""} title="Subrayado" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("superscript") ? "active" : ""} title="Superindice" onClick={() => editor.chain().focus().toggleSuperscript().run()}><SuperscriptIcon aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("subscript") ? "active" : ""} title="Subindice" onClick={() => editor.chain().focus().toggleSubscript().run()}><SubscriptIcon aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("highlight") ? "active" : ""} title="Highlight" onClick={() => editor.chain().focus().toggleHighlight({ color: "#7B3DFF44" }).run()}><Highlighter aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("blockquote") ? "active" : ""} title="Cita" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("bulletList") ? "active" : ""} title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}><List aria-hidden="true" /></button>
        <button type="button" className={editor.isActive("orderedList") ? "active" : ""} title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered aria-hidden="true" /></button>
        <TypographySpacingControl
          compact
          editor={editor}
          onChange={(html) => onChange(sanitizeRichHtml(html))}
          labels={{ letterSpacing: t("letterSpacing"), lineHeight: t("lineHeight"), control: `${t("letterSpacing")} / ${t("lineHeight")}` }}
        />
        <button type="button" title="Enlace" onClick={() => {
          const href = window.prompt("Pega la URL");
          if (!href) return;
          editor.chain().focus().setLink({ href, target: "_blank" }).run();
        }}><LinkIcon aria-hidden="true" /></button>
        <button type="button" title="Imagen" onClick={() => imageInputRef.current?.click()}>Imagen</button>
      </div>
      <EditorContent className="mini-rich-content" editor={editor} />
      <input ref={imageInputRef} hidden type="file" accept={IMAGE_ACCEPT} onChange={(event) => { void handleImage(event.target.files?.[0]); event.target.value = ""; }} />
      {message ? <small className="mini-rich-message">{message}</small> : null}
    </div>
  );
}
