"use client";

import { useEffect } from "react";

export function ReadingProgress() {
  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (scrollTop / max) * 100 : 0;
      document.documentElement.style.setProperty("--progress", `${progress}%`);
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return <div className="progress" aria-hidden="true" />;
}
