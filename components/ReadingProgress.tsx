"use client";

import { useEffect } from "react";

export function ReadingProgress({ articleId, enabled = false }: { articleId?: string; enabled?: boolean }) {
  useEffect(() => {
    let saveTimer: number | undefined;
    let restored = false;

    function persist(progress: number, lastPosition: number) {
      if (!enabled || !articleId) return;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        void fetch("/api/member/reading-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, progress, lastPosition }),
          keepalive: true,
        });
      }, 700);
    }

    function updateProgress() {
      const scrollTop = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (scrollTop / max) * 100 : 0;
      document.documentElement.style.setProperty("--progress", `${progress}%`);
      persist(progress, scrollTop);
    }

    const resume = Number(new URLSearchParams(window.location.search).get("resume"));
    if (!restored && Number.isFinite(resume) && resume > 0) {
      restored = true;
      requestAnimationFrame(() => window.scrollTo({ top: resume, behavior: "smooth" }));
    } else {
      updateProgress();
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      window.clearTimeout(saveTimer);
    };
  }, [articleId, enabled]);

  return <div className="progress" aria-hidden="true" />;
}
