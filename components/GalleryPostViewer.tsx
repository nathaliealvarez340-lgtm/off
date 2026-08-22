"use client";

import { Heart, Link2, Share2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PostMusicPlayer } from "@/components/PostMusicPlayer";
import { ThreadedComments } from "@/components/ThreadedComments";
import { GALLERY_CATEGORY_LABELS, type GalleryPostData } from "@/lib/gallery";
import type { UiLanguage } from "@/lib/ui-i18n";
import { useMobileCopy } from "@/mobile/mobileCopy";

export function GalleryPostViewer({ post, initialLanguage = "es", onClose, previousControl, nextControl, standalone = false, previewMode = false }: {
  post: GalleryPostData;
  initialLanguage?: UiLanguage;
  onClose?: () => void;
  previousControl?: React.ReactNode;
  nextControl?: React.ReactNode;
  standalone?: boolean;
  previewMode?: boolean;
}) {
  const { copy, language } = useMobileCopy(initialLanguage);
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transform = post.mediaTransform;
  const mediaStyle = { objectPosition: `${transform.x}% ${transform.y}%`, transform: `scale(${transform.zoom}) rotate(${transform.rotation}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})` };

  useEffect(() => {
    setLiked(post.likedByViewer);
    setLikeCount(post.likeCount);
    setShareOpen(false);
    setMessage("");
  }, [post.id, post.likeCount, post.likedByViewer]);

  async function toggleLike() {
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!liked);
    setLikeCount((value) => Math.max(0, value + (liked ? -1 : 1)));
    const response = await fetch(`/api/gallery/${post.id}/like`, { method: "POST" });
    const data = await response.json().catch(() => null) as { liked?: boolean; likeCount?: number; error?: string } | null;
    if (!response.ok) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setMessage(data?.error || copy.interactionError);
      return;
    }
    setLiked(Boolean(data?.liked));
    setLikeCount(Number(data?.likeCount) || 0);
  }

  async function recordShare(type: "EXTERNAL" | "COPY_LINK") {
    await fetch(`/api/gallery/${post.id}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type }) });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(post.permalink, window.location.origin).toString());
      await recordShare("COPY_LINK");
      setMessage(copy.linkCopied);
      setShareOpen(false);
    } catch { setMessage(copy.interactionError); }
  }

  async function shareExternal() {
    const url = new URL(post.permalink, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || "OFF", text: post.caption?.slice(0, 180), url });
        await recordShare("EXTERNAL");
      } else await copyLink();
      setShareOpen(false);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage(copy.interactionError);
    }
  }

  return (
    <div className={`off-gallery-viewer ${standalone ? "is-standalone" : ""}`} role={standalone ? undefined : "dialog"} aria-modal={standalone ? undefined : "true"} aria-label={post.title || copy.gallery} tabIndex={-1}>
      {onClose ? <button className="off-gallery-viewer-close" type="button" onClick={onClose} aria-label={copy.close}><X /></button> : <Link className="off-gallery-viewer-close" href="/lounge#galeria" aria-label={copy.close}><X /></Link>}
      {previousControl}{nextControl}
      <div className="off-gallery-viewer-media"><div className="off-gallery-media-frame">
        {post.mediaType === "IMAGE" ? <img src={post.mediaUrl} alt={post.altText || post.caption || copy.galleryImageAlt} style={mediaStyle} /> : <video ref={videoRef} src={post.mediaUrl} poster={post.thumbnailUrl || undefined} controls preload="metadata" muted={Boolean(post.musicSource || post.audioUrl || post.spotifyTrackId)} style={mediaStyle} />}
      </div></div>
      <aside className="off-gallery-viewer-panel">
        <div className="off-gallery-viewer-copy">
          <small>{GALLERY_CATEGORY_LABELS[post.category]}</small>
          {post.title ? <h3>{post.title}</h3> : null}
          {post.caption ? <p>{post.caption}</p> : null}
          <time>{new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.publishedAt))}</time>
        </div>
        <PostMusicPlayer key={`${post.id}-${post.musicSource ?? "none"}-${post.spotifyTrackId ?? post.audioUrl ?? ""}`} musicSource={post.musicSource} audioUrl={post.audioUrl} audioTitle={post.audioTitle} audioArtist={post.audioArtist} spotifyTrackId={post.spotifyTrackId} playLabel={copy.playMusic} pauseLabel={copy.pauseMusic} musicLabel={copy.music} />
        {!previewMode ? <>
          <div className="off-gallery-social-actions">
            <button className={liked ? "is-active" : ""} type="button" onClick={toggleLike} aria-label={copy.like}><Heart fill={liked ? "currentColor" : "none"} /><span>{likeCount}</span></button>
            <button type="button" onClick={() => setShareOpen((value) => !value)} aria-label={copy.share}><Share2 /><span>{copy.share}</span></button>
          </div>
          {shareOpen ? <div className="off-gallery-share-sheet"><button type="button" onClick={shareExternal}><Share2 />{copy.shareOtherApp}</button><button type="button" onClick={copyLink}><Link2 />{copy.copyLink}</button></div> : null}
          <ThreadedComments endpoint={`/api/gallery/${post.id}/comments`} initialCount={post.commentCount} language={language} reportType="GALLERY_COMMENT" compact />
        </> : <p className="off-gallery-preview-note">Vista previa editorial</p>}
        {message ? <p className="off-gallery-feedback" role="status">{message}</p> : null}
      </aside>
    </div>
  );
}
