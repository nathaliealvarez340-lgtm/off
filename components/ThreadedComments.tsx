"use client";

import { Heart, MoreHorizontal, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  autoLoad?: boolean;
  staticHeader?: boolean;
};

type CommentsResponse = {
  comments?: SocialCommentData[];
  comment?: SocialCommentData;
  totalCount?: number;
  hasMore?: boolean;
  deletedCount?: number;
  tombstoned?: boolean;
  error?: string;
};

const EMPTY_COMMENTS: SocialCommentData[] = [];

function mergeUnique(
  current: SocialCommentData[],
  incoming: SocialCommentData[],
) {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !known.has(item.id))];
}

function updateNested(
  comments: SocialCommentData[],
  targetId: string,
  updater: (item: SocialCommentData) => SocialCommentData,
) {
  return comments.map((comment) =>
    comment.id === targetId
      ? updater(comment)
      : {
          ...comment,
          replies: comment.replies.map((reply) =>
            reply.id === targetId ? updater(reply) : reply,
          ),
        },
  );
}

export function ThreadedComments({
  endpoint,
  initialComments = EMPTY_COMMENTS,
  initialCount = 0,
  language,
  allowLikes = false,
  reportType = "COMMUNITY_COMMENT",
  compact = false,
  readOnly = false,
  likeEndpointPrefix = "/api/community/comments",
  autoLoad = false,
  staticHeader = false,
}: ThreadedCommentsProps) {
  const copy = communityCopy[language];
  const [comments, setComments] = useState(initialComments);
  const [loaded, setLoaded] = useState(initialComments.length > 0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<SocialCommentData | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [totalCount, setTotalCount] = useState(initialCount);
  const [hasMoreRoots, setHasMoreRoots] = useState(false);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setComments(initialComments);
    setLoaded(initialComments.length > 0);
    setTotalCount(initialCount);
    setExpanded({});
    setReplyTo(null);
    setContent("");
    setMessage("");
  }, [endpoint, initialComments, initialCount]);

  const loadRoots = useCallback(
    async (append = false) => {
      if (loading) return;
      setLoading(true);
      setMessage("");
      const separator = endpoint.includes("?") ? "&" : "?";
      const url = append
        ? `${endpoint}${separator}offset=${comments.length}`
        : endpoint;
      try {
        const response = await fetch(url);
        const data = (await response
          .json()
          .catch(() => null)) as CommentsResponse | null;
        if (!response.ok) throw new Error(data?.error || copy.actionError);
        setComments((items) =>
          append
            ? mergeUnique(items, data?.comments ?? [])
            : (data?.comments ?? []),
        );
        if (typeof data?.totalCount === "number")
          setTotalCount(data.totalCount);
        setHasMoreRoots(Boolean(data?.hasMore));
        setLoaded(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : copy.actionError);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    },
    [comments.length, copy.actionError, endpoint, loading],
  );

  useEffect(() => {
    if (autoLoad && !loaded && !loading) void loadRoots();
  }, [autoLoad, loaded, loading, loadRoots]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = content.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: value, parentId: replyTo?.id ?? null }),
      });
      const data = (await response
        .json()
        .catch(() => null)) as CommentsResponse | null;
      if (!response.ok || !data?.comment) throw new Error(copy.publishError);
      const comment = data.comment;
      setLoaded(true);
      setTotalCount((count) => count + 1);
      if (comment.parentId) {
        setComments((items) =>
          items.map((item) =>
            item.id === comment.parentId
              ? {
                  ...item,
                  replyCount: item.replyCount + 1,
                  replies: mergeUnique(item.replies, [comment]),
                }
              : item,
          ),
        );
        setExpanded((value) => ({ ...value, [comment.parentId!]: true }));
      } else setComments((items) => [comment, ...items]);
      setContent("");
      setReplyTo(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.publishError);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMoreReplies(comment: SocialCommentData) {
    const separator = endpoint.includes("?") ? "&" : "?";
    try {
      const response = await fetch(
        `${endpoint}${separator}parentId=${encodeURIComponent(comment.id)}&offset=${comment.replies.length}`,
      );
      const data = (await response
        .json()
        .catch(() => null)) as CommentsResponse | null;
      if (!response.ok) throw new Error(copy.repliesError);
      setComments((items) =>
        items.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                replies: mergeUnique(item.replies, data?.comments ?? []),
              }
            : item,
        ),
      );
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.repliesError);
      return false;
    }
  }

  async function toggleThread(comment: SocialCommentData) {
    const opening = !expanded[comment.id];
    if (
      opening &&
      comment.replies.length === 0 &&
      !(await loadMoreReplies(comment))
    )
      return;
    setExpanded((value) => ({ ...value, [comment.id]: opening }));
  }

  async function toggleLike(comment: SocialCommentData) {
    if (!allowLikes) return;
    const snapshot = comments;
    setComments((items) =>
      updateNested(items, comment.id, (item) => ({
        ...item,
        likedByViewer: !item.likedByViewer,
        likeCount: Math.max(0, item.likeCount + (item.likedByViewer ? -1 : 1)),
      })),
    );
    try {
      const response = await fetch(`${likeEndpointPrefix}/${comment.id}/like`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(copy.actionError);
    } catch {
      setComments(snapshot);
      setMessage(copy.actionError);
    }
  }

  async function remove(comment: SocialCommentData) {
    if (!window.confirm(copy.confirmDelete)) return;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commentId: comment.id }),
    });
    const data = (await response
      .json()
      .catch(() => null)) as CommentsResponse | null;
    if (!response.ok) {
      setMessage(data?.error || copy.actionError);
      return;
    }
    const deletedCount = Math.max(
      1,
      data?.deletedCount ?? (comment.parentId ? 1 : 1 + comment.replyCount),
    );
    setTotalCount((count) => Math.max(0, count - deletedCount));
    if (data?.tombstoned && !comment.parentId) {
      setComments((items) =>
        items.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                content: copy.deletedComment,
                deleted: true,
                canDelete: false,
              }
            : item,
        ),
      );
    } else if (comment.parentId) {
      setComments((items) =>
        items.map((item) =>
          item.id === comment.parentId
            ? {
                ...item,
                replies: item.replies.filter(
                  (reply) => reply.id !== comment.id,
                ),
                replyCount: Math.max(0, item.replyCount - deletedCount),
              }
            : item,
        ),
      );
    } else
      setComments((items) => items.filter((item) => item.id !== comment.id));
    if (replyTo?.id === comment.id) setReplyTo(null);
  }

  async function report(commentId: string) {
    const response = await fetch("/api/community/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: reportType, targetId: commentId }),
    });
    setReportOpen(null);
    setMessage(response.ok ? copy.reportSent : copy.actionError);
  }

  function renderComment(item: SocialCommentData, nested = false) {
    const isOpen = Boolean(expanded[item.id]);
    const repliesId = `thread-replies-${item.id}`;
    const featuredLabel = {
      es: "Destacada por OFF",
      en: "Featured by OFF",
      it: "In evidenza da OFF",
      pt: "Destacada pela OFF",
    }[language];
    return (
      <article
        className={`off-thread-comment ${nested ? "is-reply" : ""} ${item.deleted ? "is-deleted" : ""}`}
        id={`comment-${item.id}`}
        key={item.id}
      >
        <div className="off-thread-comment-head">
          <strong>{item.user.name}</strong>
          <small>{item.user.offId}</small>
          <time>
            {new Intl.DateTimeFormat(language, {
              day: "numeric",
              month: "short",
            }).format(new Date(item.createdAt))}
          </time>
        </div>
        {item.featured ? (
          <span className="off-thread-featured">{featuredLabel}</span>
        ) : null}
        <p>{item.deleted ? copy.deletedComment : item.content}</p>
        <div className="off-thread-comment-controls">
          <div className="off-thread-actions">
            {allowLikes && !item.deleted ? (
              <button
                className={item.likedByViewer ? "is-active" : ""}
                type="button"
                onClick={() => toggleLike(item)}
              >
                <Heart fill={item.likedByViewer ? "currentColor" : "none"} />
                {item.likeCount || ""}
              </button>
            ) : null}
            {!readOnly && !item.deleted ? (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(item);
                  setContent("");
                }}
              >
                {copy.reply}
              </button>
            ) : null}
            {item.canDelete && !item.deleted ? (
              <button type="button" onClick={() => remove(item)}>
                {copy.delete}
              </button>
            ) : null}
            {!item.canDelete && !item.deleted ? (
              <span className="off-thread-report-menu">
                <button
                  type="button"
                  aria-label={copy.report}
                  aria-expanded={reportOpen === item.id}
                  onClick={() =>
                    setReportOpen((value) =>
                      value === item.id ? null : item.id,
                    )
                  }
                >
                  <MoreHorizontal />
                </button>
                {reportOpen === item.id ? (
                  <button type="button" onClick={() => report(item.id)}>
                    {copy.report}
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>
          {!nested && item.replyCount > 0 ? (
            <button
              className="off-thread-toggle"
              type="button"
              aria-expanded={isOpen}
              aria-controls={repliesId}
              onClick={() => toggleThread(item)}
            >
              {isOpen ? copy.hide : copy.showMore}
            </button>
          ) : null}
        </div>
        {!nested && isOpen ? (
          <div className="off-thread-replies" id={repliesId}>
            {item.replies.map((reply) => renderComment(reply, true))}
            {item.replies.length < item.replyCount ? (
              <button type="button" onClick={() => loadMoreReplies(item)}>
                {copy.showMore}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  const title = (
    <>
      <span>{copy.comments}</span>
      <small>{totalCount}</small>
    </>
  );
  return (
    <section className={`off-thread ${compact ? "is-compact" : ""}`}>
      {staticHeader ? (
        <div className="off-thread-title">{title}</div>
      ) : (
        <button
          className="off-thread-title"
          type="button"
          onClick={() => loadRoots()}
        >
          {title}
        </button>
      )}
      {!loaded && !autoLoad && comments.length === 0 ? (
        <button
          className="off-thread-open"
          type="button"
          onClick={() => loadRoots()}
        >
          {loading ? "…" : copy.viewReplies}
        </button>
      ) : null}
      {loading && !loaded ? (
        <div className="off-thread-loading" aria-live="polite">
          …
        </div>
      ) : null}
      {loaded ? (
        <div className="off-thread-list">
          {comments.map((item) => renderComment(item))}
          {hasMoreRoots ? (
            <button
              className="off-thread-load-more"
              type="button"
              onClick={() => loadRoots(true)}
            >
              {copy.loadMore}
            </button>
          ) : null}
        </div>
      ) : null}
      {!readOnly ? (
        <form className="off-thread-composer" onSubmit={submit}>
          {replyTo ? (
            <span>
              {copy.replyingTo} {replyTo.user.name}
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label={copy.cancel}
              >
                ×
              </button>
            </span>
          ) : null}
          <div>
            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value.slice(0, 1000))
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  submitRef.current?.click();
                }
              }}
              placeholder={copy.writeComment}
              rows={1}
            />
            <button
              ref={submitRef}
              type="submit"
              disabled={submitting || loading || !content.trim()}
              aria-label={copy.publish}
            >
              {submitting ? (
                <span className="off-thread-sending">…</span>
              ) : (
                <Send />
              )}
            </button>
          </div>
        </form>
      ) : null}
      {message ? (
        <p className="off-thread-feedback" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
