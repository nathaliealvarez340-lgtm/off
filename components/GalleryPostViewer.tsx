"use client";

import { Heart, Link2, Send, Share2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GALLERY_CATEGORY_LABELS, type GalleryPostData } from "@/lib/gallery";
import { PostMusicPlayer } from "@/components/PostMusicPlayer";
import type { UiLanguage } from "@/lib/ui-i18n";
import { useMobileCopy } from "@/mobile/mobileCopy";

type GalleryComment = { id: string; name: string; content: string; createdAt: string; canDelete: boolean };
type MemberResult = { id: string; name: string; offId: string };

export function GalleryPostViewer({ post, initialLanguage = "es", onClose, previousControl, nextControl, standalone = false, previewMode = false }: {
  post: GalleryPostData;
  initialLanguage?: UiLanguage;
  onClose?: () => void;
  previousControl?: React.ReactNode;
  nextControl?: React.ReactNode;
  standalone?: boolean;
  previewMode?: boolean;
}) {
  const { copy } = useMobileCopy(initialLanguage);
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [comment, setComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<MemberResult[]>([]);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transform = post.mediaTransform;
  const mediaStyle = {
    objectPosition: `${transform.x}% ${transform.y}%`,
    transform: `scale(${transform.zoom}) rotate(${transform.rotation}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
  };

  useEffect(() => {
    setLiked(post.likedByViewer);
    setLikeCount(post.likeCount);
    setCommentsLoading(!previewMode);
    if (!previewMode) {
      fetch(`/api/gallery/${post.id}/comments`)
        .then((response) => response.json())
        .then((data: { comments?: GalleryComment[] }) => setComments(data.comments ?? []))
        .finally(() => setCommentsLoading(false));
    }

  }, [post.id, post.likeCount, post.likedByViewer, previewMode]);

  useEffect(() => {
    if (!shareOpen || memberQuery.trim().length < 2) return setMembers([]);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/members/search?q=${encodeURIComponent(memberQuery.trim())}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { members?: MemberResult[] }) => setMembers(data.members ?? []))
        .catch(() => undefined);
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [memberQuery, shareOpen]);

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
    } else {
      setLiked(Boolean(data?.liked));
      setLikeCount(Number(data?.likeCount) || 0);
    }
  }

  async function publishComment(event: React.FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    const response = await fetch(`/api/gallery/${post.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: comment }) });
    const data = await response.json().catch(() => null) as { comment?: GalleryComment; error?: string } | null;
    if (response.ok && data?.comment) { setComments((items) => [...items, data.comment as GalleryComment]); setComment(""); }
    else setMessage(data?.error || copy.interactionError);
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(`/api/gallery/${post.id}/comments`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ commentId }) });
    if (response.ok) setComments((items) => items.filter((item) => item.id !== commentId));
  }

  async function recordShare(type: "INTERNAL" | "EXTERNAL" | "COPY_LINK", recipientId?: string) {
    const response = await fetch(`/api/gallery/${post.id}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, recipientId }) });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || copy.interactionError);
  }

  async function shareExternal() {
    const url = new URL(post.permalink, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || "OFF", text: post.caption?.slice(0, 180), url });
        await recordShare("EXTERNAL");
      } else await copyLink();
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage(copy.interactionError);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(post.permalink, window.location.origin).toString());
      await recordShare("COPY_LINK");
      setMessage(copy.linkCopied);
    } catch {
      setMessage(copy.interactionError);
    }
  }

  async function shareWithMember(member: MemberResult) {
    try {
      await recordShare("INTERNAL", member.id);
      setMessage(`${copy.sharedWith} ${member.name}.`);
      setShareOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.interactionError);
    }
  }

  return (
    <div className={`off-gallery-viewer ${standalone ? "is-standalone" : ""}`} role={standalone ? undefined : "dialog"} aria-modal={standalone ? undefined : "true"} aria-label={post.title || copy.gallery} tabIndex={-1}>
      {onClose ? <button className="off-gallery-viewer-close" type="button" onClick={onClose} aria-label={copy.close}><X /></button> : <Link className="off-gallery-viewer-close" href="/lounge#galeria" aria-label={copy.close}><X /></Link>}
      {previousControl}{nextControl}
      <div className="off-gallery-viewer-media">
        <div className="off-gallery-media-frame">
          {post.mediaType === "IMAGE" ? <img src={post.mediaUrl} alt={post.altText || post.caption || copy.galleryImageAlt} style={mediaStyle} /> : <video ref={videoRef} src={post.mediaUrl} poster={post.thumbnailUrl || undefined} controls preload="metadata" muted={Boolean(post.musicSource || post.audioUrl || post.spotifyTrackId)} style={mediaStyle} />}
        </div>
      </div>
      <aside className="off-gallery-viewer-panel">
        <div className="off-gallery-viewer-copy">
          <small>{GALLERY_CATEGORY_LABELS[post.category]}</small>
          {post.title ? <h3>{post.title}</h3> : null}
          {post.caption ? <p>{post.caption}</p> : null}
          <time>{new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.publishedAt))}</time>
        </div>
        <PostMusicPlayer key={`${post.id}-${post.musicSource ?? "none"}-${post.spotifyTrackId ?? post.audioUrl ?? ""}`} musicSource={post.musicSource} audioUrl={post.audioUrl} audioTitle={post.audioTitle} audioArtist={post.audioArtist} spotifyTrackId={post.spotifyTrackId} playLabel={copy.playMusic} pauseLabel={copy.pauseMusic} musicLabel={copy.music} />
        {!previewMode ? <><div className="off-gallery-social-actions">
          <button className={liked ? "is-active" : ""} type="button" onClick={toggleLike} aria-label={copy.like}><Heart fill={liked ? "currentColor" : "none"} /><span>{likeCount}</span></button>
          <button type="button" onClick={() => setShareOpen((value) => !value)} aria-label={copy.share}><Share2 /><span>{copy.share}</span></button>
        </div>
        {shareOpen ? (
          <div className="off-gallery-share-sheet">
            <button type="button" onClick={shareExternal}><Share2 />{copy.shareOtherApp}</button>
            <button type="button" onClick={copyLink}><Link2 />{copy.copyLink}</button>
            <label><span>{copy.shareWithMember}</span><input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder={copy.memberSearchPlaceholder} /></label>
            {members.map((member) => <button type="button" onClick={() => shareWithMember(member)} key={member.id}><span><strong>{member.name}</strong><small>{member.offId}</small></span><Send /></button>)}
          </div>
        ) : null}
        <section className="off-gallery-comments">
          <h4>{copy.comments} <span>{comments.length}</span></h4>
          <div>{commentsLoading ? <p>{copy.loading}</p> : comments.map((item) => <article key={item.id}><span><strong>{item.name}</strong><time>{new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.max(0, Math.round((Date.now() - new Date(item.createdAt).getTime()) / 86_400_000)), "day")}</time></span><p>{item.content}</p>{item.canDelete ? <button type="button" onClick={() => deleteComment(item.id)} aria-label={copy.deleteComment}><Trash2 /></button> : null}</article>)}</div>
          <form onSubmit={publishComment}><input value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1000))} placeholder={copy.writeComment} /><button type="submit" aria-label={copy.publishComment}><Send /></button></form>
        </section></> : <p className="off-gallery-preview-note">Vista previa editorial</p>}
        {message ? <p className="off-gallery-feedback" role="status">{message}</p> : null}
      </aside>
    </div>
  );
}
