"use client";

import { useEffect, useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  function copyLink() {
    navigator.clipboard.writeText(url || window.location.href);
  }

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="share-row" aria-label="Compartir capítulo">
      <a className="ghost-button" href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank">
        Compartir en X
      </a>
      <a className="ghost-button" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank">
        LinkedIn
      </a>
      <button className="ghost-button" onClick={copyLink} type="button">
        Copiar link
      </button>
    </div>
  );
}
