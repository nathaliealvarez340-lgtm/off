"use client";

import { ChevronDown, ChevronUp, Heart, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { communityCopy } from "@/lib/community-i18n";
import type { SocialCommentData } from "@/lib/community";
import type { UiLanguage } from "@/lib/ui-i18n";

type ThreadedCommentsProps = {
  endpoint: string;
  initialComments?: SocialCommentData[];
  initialCount?: number;
  language: UiLanguage;
  allowLikes?: boolean;
  reportType?: "COMMUNITY_COMMENT" | "GALLERY_COMMENT";
  compact?: boolean;
  readOnly?: boolean;
  likeEndpointPrefix?: string;
};

function mergeReply(comments: SocialCommentData[], reply: SocialCommentData) {
  const rootId = reply.parentId;
  return comments.map((comment) => comment.id === rootId
    ? { ...comment, replyCount: comment.replyCount + 1, replies: [...comment.replies, reply] }
    : comment);
}

export function ThreadedComments({ endpoint, initialComments = [], initialCount, language, allowLikes = false, reportType = "COMMUNITY_COMMENT", compact = false, readOnly = false, likeEndpointPrefix = "/api/community/comments" }: ThreadedCommentsProps) {
  const copy = communityCopy[language];
  const [comments, setComments] = useState(initialComments);
  const [loaded, setLoaded] = useState(initialComments.length > 0);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<SocialCommentData | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const count = useMemo(() => initialCount ?? comments.reduce((total, item) => total + 1 + item.replyCount, 0), [comments, initialCount]);

  async function loadRoots() {
    if (loaded || loading) return;
    setLoading(true);
    const response = await fetch(endpoint);
    const data = await response.json().catch(() => null) as { comments?: SocialCommentData[]; error?: string } | null;
    if (response.ok) { setComments(data?.comments ?? []); setLoaded(true); }
    else setMessage(data?.error || copy.actionError);
    setLoading(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value) return;
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: value, parentId: replyTo?.id ?? null }) });
    const data = await response.json().catch(() => null) as { comment?: SocialCommentData; error?: string } | null;
    if (!response.ok || !data?.comment) { setMessage(data?.error || copy.actionError); return; }
    if (data.comment.parentId) {
      setComments((items) => mergeReply(items, data.comment as SocialCommentData));
      setExpanded((value) => ({ ...value, [data.comment!.parentId!]: true }));
    } else setComments((items) => [data.comment as SocialCommentData, ...items]);
    setContent("");
    setReplyTo(null);
  }

  async function loadMoreReplies(comment: SocialCommentData) {
    const response = await fetch(`${endpoint}?parentId=${encodeURIComponent(comment.id)}&offset=${comment.replies.length}`);
    const data = await response.json().catch(() => null) as { comments?: SocialCommentData[]; error?: string } | null;
    if (!response.ok) { setMessage(data?.error || copy.actionError); return; }
    setComments((items) => items.map((item) => item.id === comment.id ? { ...item, replies: [...item.replies, ...(data?.comments ?? [])] } : item));
  }

  async function toggleLike(comment: SocialCommentData) {
    if (!allowLikes) return;
    setComments((items) => items.map((item) => item.id === comment.id
      ? { ...item, likedByViewer: !item.likedByViewer, likeCount: Math.max(0, item.likeCount + (item.likedByViewer ? -1 : 1)) }
      : { ...item, replies: item.replies.map((reply) => reply.id === comment.id ? { ...reply, likedByViewer: !reply.likedByViewer, likeCount: Math.max(0, reply.likeCount + (reply.likedByViewer ? -1 : 1)) } : reply) }));
    const response = await fetch(`${likeEndpointPrefix}/${comment.id}/like`, { method: "POST" });
    if (!response.ok) setMessage(copy.actionError);
  }

  async function remove(commentId: string) {
    const response = await fetch(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ commentId }) });
    if (!response.ok) { setMessage(copy.actionError); return; }
    setComments((items) => items.filter((item) => item.id !== commentId).map((item) => ({ ...item, replies: item.replies.filter((reply) => reply.id !== commentId), replyCount: item.replies.some((reply) => reply.id === commentId) ? Math.max(0, item.replyCount - 1) : item.replyCount })));
  }

  async function report(commentId: string) {
    const response = await fetch("/api/community/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType: reportType, targetId: commentId }) });
    setMessage(response.ok ? "Reporte enviado." : copy.actionError);
  }

  function renderComment(item: SocialCommentData, nested = false) {
    const isOpen = expanded[item.id];
    const featuredLabel = { es: "Destacada por OFF", en: "Featured by OFF", it: "In evidenza da OFF", pt: "Destacada pela OFF" }[language];
    return (
      <article className={`off-thread-comment ${nested ? "is-reply" : ""}`} id={`comment-${item.id}`} key={item.id}>
        <div className="off-thread-comment-head"><strong>{item.user.name}</strong><small>{item.user.offId}</small><time>{new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</time></div>
        {item.featured ? <span className="off-thread-featured">{featuredLabel}</span> : null}
        <p>{item.content}</p>
        <div className="off-thread-actions">
          {allowLikes ? <button className={item.likedByViewer ? "is-active" : ""} type="button" onClick={() => toggleLike(item)}><Heart fill={item.likedByViewer ? "currentColor" : "none"} />{item.likeCount || ""}</button> : null}
          {!readOnly ? <button type="button" onClick={() => { setReplyTo(item); setContent(""); }}>{copy.reply}</button> : null}
          {item.canDelete ? <button type="button" onClick={() => remove(item.id)} aria-label={copy.delete}><Trash2 /></button> : null}
          <button type="button" onClick={() => report(item.id)} aria-label={copy.report}><MoreHorizontal /></button>
        </div>
        {!nested && item.replyCount > 0 ? (
          <button className="off-thread-toggle" type="button" onClick={() => setExpanded((value) => ({ ...value, [item.id]: !value[item.id] }))}>
            {isOpen ? <ChevronUp /> : <ChevronDown />}{isOpen ? copy.hideReplies : `${copy.viewReplies} (${item.replyCount})`}
          </button>
        ) : null}
        {!nested && isOpen ? (
          <div className="off-thread-replies">
            {item.replies.map((reply) => renderComment(reply, true))}
            {item.replies.length < item.replyCount ? <button type="button" onClick={() => loadMoreReplies(item)}>{item.replyCount - item.replies.length} {copy.moreReplies}</button> : null}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className={`off-thread ${compact ? "is-compact" : ""}`}>
      <button className="off-thread-title" type="button" onClick={loadRoots}><span>{copy.comments}</span><small>{count}</small></button>
      {!loaded && comments.length === 0 ? <button className="off-thread-open" type="button" onClick={loadRoots}>{loading ? "..." : copy.viewReplies}</button> : null}
      {loaded ? <div className="off-thread-list">{comments.map((item) => renderComment(item))}</div> : null}
      {!readOnly ? <form className="off-thread-composer" onSubmit={submit}>
        {replyTo ? <span>{copy.replyingTo} {replyTo.user.name}<button type="button" onClick={() => setReplyTo(null)}>×</button></span> : null}
        <div><textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 1000))} placeholder={copy.writeComment} rows={1} /><button type="submit" aria-label={copy.publish}><Send /></button></div>
      </form> : null}
      {message ? <p className="off-thread-feedback" role="status">{message}</p> : null}
    </section>
  );
}
