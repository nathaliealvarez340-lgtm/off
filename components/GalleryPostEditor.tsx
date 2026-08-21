"use client";

import type { GalleryPost } from "@prisma/client";
import { ArrowLeft, FlipHorizontal2, FlipVertical2, ImagePlus, Music2, RotateCw, Save, Scan, Trash2, Upload, Video, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteGalleryPostAction, saveGalleryPostAction, type SaveGalleryPostState } from "@/app/actions";
import { GalleryPostViewer } from "@/components/GalleryPostViewer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SearchKeywordsInput } from "@/components/SearchKeywordsInput";
import { SpotifyTrackEmbed } from "@/components/SpotifyTrackEmbed";
import { DEFAULT_GALLERY_TRANSFORM, GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS, normalizeGalleryTransform, type GalleryMediaTransform, type GalleryPostData } from "@/lib/gallery";
import { useMobileCopy } from "@/mobile/mobileCopy";
import { parseSpotifyTrackUrl } from "@/lib/spotify";

const initialState: SaveGalleryPostState = { ok: false, message: "" };
type UploadResponse = { success?: boolean; url?: string; error?: string };
type MusicSource = "NONE" | "UPLOAD" | "SPOTIFY";

async function uploadFile(file: File, kind: "image" | "video" | "audio") {
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
  const [audioUrl, setAudioUrl] = useState(post?.audioUrl ?? "");
  const [audioTitle, setAudioTitle] = useState(post?.audioTitle ?? "");
  const [audioArtist, setAudioArtist] = useState(post?.audioArtist ?? "");
  const [musicSource, setMusicSource] = useState<MusicSource>(post?.musicSource ?? (post?.spotifyTrackId ? "SPOTIFY" : post?.audioUrl ? "UPLOAD" : "NONE"));
  const [spotifyUrl, setSpotifyUrl] = useState(post?.spotifyUrl ?? (post?.spotifyTrackId ? `https://open.spotify.com/track/${post.spotifyTrackId}` : ""));
  const [spotifyTrackId, setSpotifyTrackId] = useState(post?.spotifyTrackId ?? "");
  const [spotifyError, setSpotifyError] = useState("");
  const [hideActionMessage, setHideActionMessage] = useState(false);
  const [title, setTitle] = useState(post?.title ?? "");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [altText, setAltText] = useState(post?.altText ?? "");
  const [category, setCategory] = useState(post?.category ?? "EXPLORE");
  const [transform, setTransform] = useState<GalleryMediaTransform>(normalizeGalleryTransform(post?.mediaTransform));
  const [editingMedia, setEditingMedia] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const spotifyInputRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const router = useRouter();
  const { copy } = useMobileCopy();

  useEffect(() => {
    if (state.ok && state.id && !post) router.replace(`/admin/content/${state.id}`);
  }, [post, router, state.id, state.ok]);

  useEffect(() => {
    setHideActionMessage(false);
  }, [state.message, state.ok]);

  useEffect(() => {
    if (musicSource !== "SPOTIFY" || !spotifyUrl.trim()) return;
    const timeout = window.setTimeout(() => validateSpotifyUrl(spotifyUrl, true), 500);
    return () => window.clearTimeout(timeout);
  }, [musicSource, spotifyUrl]);

  async function handleUpload(file: File | undefined, kind: "image" | "video" | "audio") {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadFile(file, kind);
      if (kind === "audio") { setAudioUrl(url); setMusicSource("UPLOAD"); }
      else {
        setMediaType(kind === "video" ? "VIDEO" : "IMAGE");
        setMediaUrl(url);
        setTransform(DEFAULT_GALLERY_TRANSFORM);
        setEditingMedia(true);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir el archivo. Revisa formato o tamaño.");
    } finally {
      setUploading(false);
    }
  }

  function updateSpotifyDraft(value: string) {
    setSpotifyUrl(value);
    setSpotifyTrackId("");
    setSpotifyError("");
    setHideActionMessage(true);
  }

  function validateSpotifyUrl(value: string, showError: boolean) {
    if (!value.trim()) {
      setSpotifyTrackId("");
      setSpotifyError("");
      return false;
    }
    const track = parseSpotifyTrackUrl(value);
    if (!track) {
      setSpotifyTrackId("");
      setSpotifyError(showError ? "Pega un enlace válido de una canción de Spotify." : "");
      return false;
    }
    if (value !== track.url) setSpotifyUrl(track.url);
    setSpotifyTrackId(track.trackId);
    setSpotifyError("");
    return true;
  }

  function toggleMusicSource(source: Exclude<MusicSource, "NONE">) {
    setMusicSource((current) => current === source ? "NONE" : source);
    setSpotifyError("");
    setHideActionMessage(true);
  }

  function removeMusic() {
    setMusicSource("NONE");
    setAudioUrl("");
    setSpotifyUrl("");
    setSpotifyTrackId("");
    setAudioTitle("");
    setAudioArtist("");
    setSpotifyError("");
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
    }
  }

  function startDrag(event: React.PointerEvent) {
    if (!editingMedia) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: transform.x, y: transform.y };
  }

  function moveDrag(event: React.PointerEvent) {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;
    const box = frame.getBoundingClientRect();
    setTransform((value) => ({ ...value, x: Math.min(100, Math.max(0, drag.x + ((event.clientX - drag.startX) / box.width) * 100)), y: Math.min(100, Math.max(0, drag.y + ((event.clientY - drag.startY) / box.height) * 100)) }));
  }

  const mediaStyle = { objectPosition: `${transform.x}% ${transform.y}%`, transform: `scale(${transform.zoom}) rotate(${transform.rotation}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})` };
  const previewPost: GalleryPostData = {
    id: post?.id ?? "preview",
    mediaType,
    mediaUrl,
    thumbnailUrl: thumbnailUrl || null,
    title: title || null,
    caption: caption || null,
    altText: altText || null,
    category,
    mediaTransform: transform,
    audioUrl: musicSource === "UPLOAD" ? audioUrl || null : null,
    audioTitle: musicSource !== "NONE" ? audioTitle || null : null,
    audioArtist: musicSource !== "NONE" ? audioArtist || null : null,
    musicSource: musicSource === "NONE" ? null : musicSource,
    spotifyUrl: musicSource === "SPOTIFY" && spotifyTrackId ? `https://open.spotify.com/track/${spotifyTrackId}` : null,
    spotifyTrackId: musicSource === "SPOTIFY" ? spotifyTrackId || null : null,
    publishedAt: post?.publishedAt?.toISOString() ?? new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    likedByViewer: false,
    permalink: post ? `/off/post/${post.id}` : "#",
  };

  return (
    <main className="gallery-editor-shell">
      <header className="gallery-editor-topbar">
        <Link href="/admin" aria-label="Volver al admin"><ArrowLeft /></Link>
        <div><span>OFF Studio</span><strong>{post ? copy.editContent : copy.publishContent}</strong></div>
        <LanguageSwitcher compact />
        <button type="button" onClick={() => setPreviewOpen(true)} disabled={!mediaUrl}>{copy.preview}</button>
      </header>
      <form action={action} className="gallery-editor-form">
        <input name="id" type="hidden" value={post?.id ?? ""} />
        <input name="mediaType" type="hidden" value={mediaType} />
        <input name="mediaUrl" type="hidden" value={mediaUrl} />
        <input name="thumbnailUrl" type="hidden" value={thumbnailUrl} />
        <input name="mediaTransform" type="hidden" value={JSON.stringify(transform)} />
        <input name="audioUrl" type="hidden" value={audioUrl} />
        <input name="musicSource" type="hidden" value={musicSource} />
        <input name="spotifyUrl" type="hidden" value={spotifyUrl} />
        <input name="spotifyTrackId" type="hidden" value={spotifyTrackId} />

        <section className="gallery-editor-preview-area">
          <div className={`gallery-editor-preview ${editingMedia ? "is-editing" : ""}`} ref={frameRef} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }}>
            {mediaUrl ? mediaType === "IMAGE" ? <img src={mediaUrl} alt="Preview" draggable={false} style={mediaStyle} /> : <video src={mediaUrl} poster={thumbnailUrl || undefined} controls={!editingMedia} muted={musicSource !== "NONE"} preload="metadata" style={mediaStyle} /> : <div><ImagePlus /><strong>{copy.frameRecommendation}</strong></div>}
          </div>
          <div className="gallery-media-primary-actions">
            <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={uploading}><Upload />{uploading ? copy.loading : mediaUrl ? copy.replaceFile : copy.uploadFile}</button>
            {mediaUrl ? <button className={editingMedia ? "is-active" : ""} type="button" onClick={() => setEditingMedia((value) => !value)}><Scan />{copy.edit}</button> : null}
          </div>
          <input ref={mediaInputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; handleUpload(file, file?.type.startsWith("video/") ? "video" : "image"); event.target.value = ""; }} />
          {editingMedia && mediaUrl ? <div className="gallery-transform-tools"><label><span>{copy.zoom}</span><input type="range" min="1" max="3" step="0.05" value={transform.zoom} onChange={(event) => setTransform((value) => ({ ...value, zoom: Number(event.target.value) }))} /><output>{transform.zoom.toFixed(2)}×</output></label><div><button type="button" onClick={() => setTransform((value) => ({ ...value, rotation: (value.rotation + 90) % 360 }))} aria-label="Rotar"><RotateCw /></button><button type="button" onClick={() => setTransform((value) => ({ ...value, flipX: !value.flipX }))} aria-label="Voltear horizontal"><FlipHorizontal2 /></button><button type="button" onClick={() => setTransform((value) => ({ ...value, flipY: !value.flipY }))} aria-label="Voltear vertical"><FlipVertical2 /></button><button type="button" onClick={() => setTransform(DEFAULT_GALLERY_TRANSFORM)}>{copy.reset}</button></div><p>{copy.dragToFrame}</p></div> : null}
        </section>

        <section className="gallery-editor-fields">
          <label><span>{copy.category}</span><select name="category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} required>{GALLERY_CATEGORIES.map((item) => <option value={item} key={item}>{GALLERY_CATEGORY_LABELS[item]}</option>)}</select></label>
          <label><span>{copy.internalTitle}</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder={copy.optional} /></label>
          <label className="gallery-caption-field"><span>{copy.postCaption}</span><textarea name="caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2000} rows={7} placeholder={copy.postCaptionPlaceholder} /></label>
          <label><span>{copy.altTextLabel}</span><textarea name="altText" value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={300} rows={3} placeholder={copy.altTextPlaceholder} /></label>
          <SearchKeywordsInput initialKeywords={post?.keywords ?? []} />
          {mediaType === "VIDEO" ? <div className="gallery-poster-field"><span>{copy.videoPoster}</span>{thumbnailUrl ? <img src={thumbnailUrl} alt={copy.videoPoster} /> : <Video />}<button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploading}>{copy.uploadPoster}</button><input ref={posterInputRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(event) => { handlePoster(event.target.files?.[0]); event.target.value = ""; }} /></div> : null}
          <div className="gallery-audio-editor">
            <div className="gallery-music-heading"><span>Música</span><div className="gallery-music-source" role="group" aria-label="Fuente de música"><button className={musicSource === "UPLOAD" ? "is-active" : ""} type="button" aria-pressed={musicSource === "UPLOAD"} onClick={() => toggleMusicSource("UPLOAD")}><Upload />Subir audio</button><button className={musicSource === "SPOTIFY" ? "is-active" : ""} type="button" aria-pressed={musicSource === "SPOTIFY"} onClick={() => toggleMusicSource("SPOTIFY")}><Music2 />Spotify</button></div></div>
            {musicSource === "UPLOAD" ? <div className="gallery-upload-music"><label className="gallery-audio-file-control"><span>Archivo de audio</span><input ref={audioInputRef} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={uploading} onChange={(event) => { handleUpload(event.target.files?.[0], "audio"); event.target.value = ""; }} /></label>{audioUrl ? <audio src={audioUrl} controls preload="metadata" /> : <small>MP3, M4A, WAV u OGG. La música es opcional.</small>}</div> : null}
            {musicSource === "SPOTIFY" ? <div className="gallery-spotify-editor"><label><span>Enlace de Spotify</span><input ref={spotifyInputRef} value={spotifyUrl} onChange={(event) => updateSpotifyDraft(event.target.value)} onBlur={(event) => validateSpotifyUrl(event.target.value, true)} placeholder="Pega el enlace de una canción de Spotify" inputMode="url" /></label><small>Pega el enlace de la canción que quieres asociar a esta publicación.</small>{spotifyError ? <p className="gallery-editor-message error">{spotifyError}</p> : null}{spotifyTrackId ? <div className="gallery-spotify-preview"><span>Preview</span><SpotifyTrackEmbed trackId={spotifyTrackId} title={audioTitle ? `${audioTitle} en Spotify` : "Preview de Spotify"} /><div><button type="button" onClick={() => spotifyInputRef.current?.focus()}>Cambiar canción</button><button type="button" onClick={removeMusic}><X />Quitar música</button></div></div> : null}</div> : null}
            {musicSource !== "NONE" ? <div className="gallery-music-metadata"><label><span>{copy.songTitle}</span><input name="audioTitle" value={audioTitle} onChange={(event) => setAudioTitle(event.target.value)} maxLength={160} /></label><label><span>{copy.artist}</span><input name="audioArtist" value={audioArtist} onChange={(event) => setAudioArtist(event.target.value)} maxLength={160} /></label>{musicSource === "UPLOAD" && audioUrl ? <button type="button" onClick={removeMusic}><X />{copy.removeMusic}</button> : null}</div> : null}
          </div>
          {uploadError ? <p className="gallery-editor-message error">{uploadError}</p> : null}
          {!hideActionMessage && state.message && state.message !== spotifyError ? <p className={`gallery-editor-message ${state.ok ? "success" : "error"}`}>{state.message}</p> : null}
        </section>
        <footer className="gallery-editor-actions"><button name="publishIntent" value="draft" type="submit" disabled={pending || uploading || !mediaUrl}><Save />{copy.saveDraft}</button><button className="primary" name="publishIntent" value="publish" type="submit" disabled={pending || uploading || !mediaUrl}>{copy.publishContent}</button></footer>
      </form>
      {post ? <form action={deleteGalleryPostAction} className="gallery-editor-delete"><input name="id" type="hidden" value={post.id} /><button type="submit" onClick={(event) => { if (!window.confirm("¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.")) event.preventDefault(); }}><Trash2 />Eliminar publicación</button></form> : null}
      {previewOpen && mediaUrl ? <div className="off-gallery-viewer-backdrop"><GalleryPostViewer post={previewPost} onClose={() => setPreviewOpen(false)} previewMode /></div> : null}
    </main>
  );
}
