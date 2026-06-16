"use client";

import { motion } from "framer-motion";

type LibraryItem = {
  title: string;
  number: string | null;
  description: string | null;
  url?: string;
};

const fallbackCollections = ["Reconstruirte", "Sueños Ajenos", "Dirección", "Identidad", "Ambición", "Relaciones"];

export function LibraryCardDeck({ items }: { items: LibraryItem[] }) {
  const collections = items.length
    ? items
    : fallbackCollections.map((title, index) => ({
      title,
      number: String(index + 1).padStart(2, "0"),
      description: "Próximamente en la Biblioteca OFF.",
      url: undefined,
    }));

  return (
    <div className="library-deck" aria-label="Colecciones editoriales">
      {collections.slice(0, 7).map((item, index) => {
        const content = (
          <>
            <span>{item.number ?? String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3>
            <p>{item.description ?? "Próximamente en la Biblioteca OFF."}</p>
            <strong>Abrir volumen</strong>
          </>
        );

        const className = `library-deck-card card-${index}`;
        return item.url ? (
          <motion.a className={className} href={item.url} key={`${item.title}-${index}`} whileHover={{ y: -18, rotate: 0, zIndex: 20 }}>
            {content}
          </motion.a>
        ) : (
          <motion.article className={className} key={`${item.title}-${index}`} whileHover={{ y: -18, rotate: 0, zIndex: 20 }}>
            {content}
          </motion.article>
        );
      })}
    </div>
  );
}
