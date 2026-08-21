"use client";

import type { GalleryPost } from "@prisma/client";
import { ArrowLeft, ImagePlus, Save, Trash2, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteGalleryPostAction, saveGalleryPostAction, type SaveGalleryPostState } from "@/app/actions";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/gallery";

const initialState: SaveGalleryPostState = { ok: false, message: "" };
type UploadResponse = { success?: boolean; url?: string; error?: string };

async function uploadFile(file: File, kind: "image" | "video") {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const response = await fetch("/api/upload", { method: "POST", body });
  const data = await response.json().catch(() => ({ success: false, error: "La respuesta de upload no fue válida." })) as UploadResponse;
  if (!response.ok || !data.success || !data.url) throw new Error(data.error || "No se pudo subir el archivo. Revisa formato o tamaño.");
  return data.url;
}

export function GalleryPostEditor({ post }: { post?: GalleryPost | null }) {
  const [state, action, pending] = useActionState(saveGalleryPostAction, initialState);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">(post?.mediaType ?? "IMAGE");
  const [mediaUrl, setMediaUrl] = useState(post?.mediaUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnailUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.id && !post) router.replace(`/admin/gallery/${state.id}`);
  }, [post, router, state.id, state.ok]);

  async function handleMedia(file?: File) {
    if (!file) return;
    const kind = file.type.startsWith("video/") ? "video" : "image";
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadFile(file, kind);
      setMediaType(kind === "video" ? "VIDEO" : "IMAGE");
      setMediaUrl(url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir el archivo. Revisa formato o tamaño.");
    } finally {
      setUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  }

  async function handlePoster(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      setThumbnailUrl(await uploadFile(file, "image"));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir el poster.");
    } finally {
      setUploading(false);
      if (posterInputRef.current) posterInputRef.current.value = "";
    }
  }

  return (
    <main className="gallery-editor-shell">
      <header className="gallery-editor-topbar">
        <Link href="/admin" aria-label="Volver al admin"><ArrowLeft /></Link>
        <div><span>OFF visual</span><strong>{post ? "Editar publicación" : "Nueva publicación"}</strong></div>
      </header>
      <form action={action} className="gallery-editor-form">
        <input name="id" type="hidden" value={post?.id ?? ""} />
        <input name="mediaType" type="hidden" value={mediaType} />
        <input name="mediaUrl" type="hidden" value={mediaUrl} />
        <input name="thumbnailUrl" type="hidden" value={thumbnailUrl} />

        <section className="gallery-editor-preview">
          {mediaUrl ? (
            mediaType === "IMAGE" ? <img src={mediaUrl} alt="Preview" /> : <video src={mediaUrl} poster={thumbnailUrl || undefined} controls preload="metadata" />
          ) : <div><ImagePlus /><strong>Media visual</strong><span>Sube una imagen o video para comenzar.</span></div>}
          <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={uploading}><Upload /> {uploading ? "Subiendo..." : mediaUrl ? "Reemplazar media" : "Subir media"}</button>
          <input ref={mediaInputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/tiff,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-ms-wmv" onChange={(event) => handleMedia(event.target.files?.[0])} />
        </section>

        <section className="gallery-editor-fields">
          <label><span>Categoría</span><select name="category" defaultValue={post?.category ?? "EXPLORE"} required>{GALLERY_CATEGORIES.map((category) => <option value={category} key={category}>{GALLERY_CATEGORY_LABELS[category]}</option>)}</select></label>
          <label><span>Título interno</span><input name="title" defaultValue={post?.title ?? ""} maxLength={160} placeholder="Opcional" /></label>
          <label className="gallery-caption-field"><span>Caption</span><textarea name="caption" defaultValue={post?.caption ?? ""} maxLength={2000} rows={7} placeholder="Escribe la tensión visual de esta publicación..." /></label>
          <label><span>Alt text</span><textarea name="altText" defaultValue={post?.altText ?? ""} maxLength={300} rows={3} placeholder="Describe el contenido visual para accesibilidad." /></label>
          {mediaType === "VIDEO" ? (
            <div className="gallery-poster-field">
              <span>Poster del video</span>
              {thumbnailUrl ? <img src={thumbnailUrl} alt="Poster del video" /> : <Video />}
              <button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploading}>Subir poster</button>
              <input ref={posterInputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => handlePoster(event.target.files?.[0])} />
            </div>
          ) : null}
          {uploadError ? <p className="gallery-editor-message error">{uploadError}</p> : null}
          {state.message ? <p className={`gallery-editor-message ${state.ok ? "success" : "error"}`}>{state.message}</p> : null}
        </section>

        <footer className="gallery-editor-actions">
          <button name="publishIntent" value="draft" type="submit" disabled={pending || uploading || !mediaUrl}><Save /> Guardar draft</button>
          <button className="primary" name="publishIntent" value="publish" type="submit" disabled={pending || uploading || !mediaUrl}>Publicar en Galería</button>
        </footer>
      </form>
      {post ? <form action={deleteGalleryPostAction} className="gallery-editor-delete"><input name="id" type="hidden" value={post.id} /><button type="submit" onClick={(event) => { if (!window.confirm("¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.")) event.preventDefault(); }}><Trash2 /> Eliminar publicación</button></form> : null}
    </main>
  );
}
