"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type LibraryItem = {
  id?: string;
  title: string;
  number: string | null;
  description: string | null;
  url?: string;
  image?: string | null;
  category?: string | null;
  date?: string | null;
  readTime?: string | null;
  cta?: string | null;
};

const fallbackImages = ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"];

function normalizeImageUrl(value?: string | null, index = 0) {
  const clean = value?.trim();
  if (!clean) return fallbackImages[index % fallbackImages.length];
  if (clean.startsWith("public/")) return `/${clean.replace(/^public\//, "")}`;
  if (clean.startsWith("./public/")) return `/${clean.replace(/^\.\/public\//, "")}`;
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("images/") || clean.startsWith("uploads/")) return `/${clean}`;
  return fallbackImages[index % fallbackImages.length];
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function LibraryCardDeck({ items }: { items: LibraryItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeItems = useMemo(() => items.filter((item) => item.title), [items]);
  const active = safeItems[activeIndex] ?? safeItems[0];

  function move(direction: -1 | 1) {
    if (!safeItems.length) return;
    setActiveIndex((current) => (current + direction + safeItems.length) % safeItems.length);
  }

  if (!active) {
    return (
      <div className="library-carousel empty-library-carousel">
        <p>Aun no hay capitulos publicados en Biblioteca.</p>
      </div>
    );
  }

  const content = (
    <>
      <div className="library-carousel-image">
        <img src={normalizeImageUrl(active.image, activeIndex)} alt="" />
      </div>
      <div className="library-carousel-copy">
        <div className="library-carousel-meta">
          <span>{active.number ?? String(activeIndex + 1).padStart(2, "0")}</span>
          <span>{active.category ?? "Biblioteca"}</span>
          {formatDate(active.date) ? <span>{formatDate(active.date)}</span> : null}
          {active.readTime ? <span>{active.readTime}</span> : null}
        </div>
        <h3>{active.title}</h3>
        <p>{active.description ?? "Proximamente en la Biblioteca OFF."}</p>
        <strong>{active.cta ?? "Abrir volumen"}</strong>
      </div>
    </>
  );

  return (
    <div className="library-carousel" aria-label="Biblioteca OFF">
      <div className="library-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <span>{activeIndex + 1} / {safeItems.length}</span>
        <button type="button" onClick={() => move(1)} aria-label="Siguiente">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {active.url ? (
        <motion.a
          className="library-carousel-card"
          href={active.url}
          key={active.id ?? active.title}
          initial={{ opacity: 0, transform: "translateY(10px) scale(0.985)" }}
          animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        >
          {content}
        </motion.a>
      ) : (
        <motion.article
          className="library-carousel-card"
          key={active.id ?? active.title}
          initial={{ opacity: 0, transform: "translateY(10px) scale(0.985)" }}
          animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        >
          {content}
        </motion.article>
      )}
    </div>
  );
}
