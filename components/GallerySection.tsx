"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Music2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GalleryCategory } from "@prisma/client";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS, type GalleryPostData } from "@/lib/gallery";
import type { UiLanguage } from "@/lib/ui-i18n";
import { useMobileCopy } from "@/mobile/mobileCopy";
import { GalleryPostViewer } from "@/components/GalleryPostViewer";

type GalleryResponse = { success: boolean; posts?: GalleryPostData[]; post?: GalleryPostData | null; hasMore?: boolean };

function galleryMediaStyle(post: GalleryPostData) {
  const transform = post.mediaTransform;
  return {
    objectPosition: `${transform.x}% ${transform.y}%`,
    transform: `scale(${transform.zoom}) rotate(${transform.rotation}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
  };
}

export function GallerySection({ initialPosts, initialHasMore, initialLanguage = "es" }: {
  initialPosts: GalleryPostData[];
  initialHasMore: boolean;
  initialLanguage?: UiLanguage;
}) {
  const { copy } = useMobileCopy(initialLanguage);
  const [posts, setPosts] = useState(initialPosts);
  const [category, setCategory] = useState<GalleryCategory | "ALL">("ALL");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const activeIndex = posts.findIndex((post) => post.id === activeId);
  const activePost = activeIndex >= 0 ? posts[activeIndex] : null;

  function isSvg(url: string) {
    return /\.svg(?:$|\?)/i.test(url);
  }

  async function requestPosts(nextCategory: GalleryCategory | "ALL", offset: number) {
    const params = new URLSearchParams({ offset: String(offset), limit: "16" });
    if (nextCategory !== "ALL") params.set("category", nextCategory);
    const response = await fetch(`/api/gallery?${params}`);
    if (!response.ok) throw new Error(copy.galleryError);
    return response.json() as Promise<GalleryResponse>;
  }

  async function changeCategory(nextCategory: GalleryCategory | "ALL") {
    setCategory(nextCategory);
    setLoading(true);
    try {
      const data = await requestPosts(nextCategory, 0);
      setPosts(data.posts ?? []);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoading(true);
    try {
      const data = await requestPosts(category, posts.length);
      setPosts((current) => [...current, ...(data.posts ?? []).filter((post) => !current.some((item) => item.id === post.id))]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function openFromSearch(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      if (posts.some((post) => post.id === id)) return setActiveId(id);
      const response = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const data = await response.json() as GalleryResponse;
      if (data.post) {
        setPosts((current) => current.some((post) => post.id === data.post?.id) ? current : [...current, data.post as GalleryPostData]);
        setActiveId(data.post.id);
      }
    }
    window.addEventListener("off-open-gallery", openFromSearch);
    return () => window.removeEventListener("off-open-gallery", openFromSearch);
  }, [posts]);

  useEffect(() => {
    if (!activePost) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") setActiveId(null);
      if (event.key === "ArrowLeft") showRelative(-1);
      if (event.key === "ArrowRight") showRelative(1);
    }
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKey); };
  }, [activePost, activeIndex, posts]);

  function showRelative(delta: number) {
    if (!posts.length || activeIndex < 0) return;
    const nextIndex = (activeIndex + delta + posts.length) % posts.length;
    setActiveId(posts[nextIndex].id);
  }

  return (
    <section className="off-gallery-section" id="galeria">
      <div className="off-gallery-heading">
        <div><span>{copy.visualArchive}</span><h2>{copy.gallery}</h2></div>
        <p>{copy.galleryIntro}</p>
      </div>
      <div className="off-gallery-filters" role="tablist" aria-label={copy.galleryFilters}>
        <button className={category === "ALL" ? "is-active" : ""} type="button" role="tab" aria-selected={category === "ALL"} onClick={() => changeCategory("ALL")}>{copy.all}</button>
        {GALLERY_CATEGORIES.map((item) => <button className={category === item ? "is-active" : ""} type="button" role="tab" aria-selected={category === item} onClick={() => changeCategory(item)} key={item}>{GALLERY_CATEGORY_LABELS[item]}</button>)}
      </div>
      <div className="off-gallery-grid" aria-live="polite" aria-busy={loading}>
        {posts.map((post) => (
          <button className="off-gallery-card" type="button" onClick={() => setActiveId(post.id)} key={post.id}>
            {post.mediaType === "IMAGE" ? (
              isSvg(post.mediaUrl)
                ? <img className="off-gallery-native-image" src={post.mediaUrl} alt={post.altText || post.caption || copy.galleryImageAlt} loading="lazy" style={galleryMediaStyle(post)} />
                : <Image src={post.mediaUrl} alt={post.altText || post.caption || copy.galleryImageAlt} fill sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw" style={galleryMediaStyle(post)} />
            ) : post.thumbnailUrl ? (
              <Image src={post.thumbnailUrl} alt={post.altText || post.caption || copy.galleryVideoAlt} fill sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw" style={galleryMediaStyle(post)} />
            ) : <span className="off-gallery-video-fallback">OFF</span>}
            {post.mediaType === "VIDEO" ? <span className="off-gallery-play"><Play /></span> : null}
            {post.musicSource || post.audioUrl || post.spotifyTrackId ? <span className="off-gallery-music"><Music2 /></span> : null}
            <span className="off-gallery-card-meta"><small>{GALLERY_CATEGORY_LABELS[post.category]}</small>{post.title ? <strong>{post.title}</strong> : null}</span>
          </button>
        ))}
      </div>
      {!posts.length && !loading ? <div className="off-gallery-empty">{copy.galleryEmpty}</div> : null}
      {hasMore ? <button className="off-gallery-load" type="button" onClick={loadMore} disabled={loading}>{loading ? copy.loading : copy.loadMore}</button> : null}

      {activePost ? (
        <div className="off-gallery-viewer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveId(null); }}>
          <div
            className="off-gallery-viewer-host"
            ref={viewerRef}
            tabIndex={-1}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return;
              const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
              if (Math.abs(distance) > 55) showRelative(distance > 0 ? -1 : 1);
              touchStartX.current = null;
            }}
          >
            <GalleryPostViewer
              post={activePost}
              initialLanguage={initialLanguage}
              onClose={() => setActiveId(null)}
              previousControl={<button className="off-gallery-viewer-prev" type="button" onClick={() => showRelative(-1)} aria-label={copy.previous}><ChevronLeft /></button>}
              nextControl={<button className="off-gallery-viewer-next" type="button" onClick={() => showRelative(1)} aria-label={copy.next}><ChevronRight /></button>}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
