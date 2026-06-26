import Link from "next/link";
import type { Article } from "@prisma/client";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { formatDate, getPlainTextPreview } from "@/lib/articles";

type Props = {
  articles: Article[];
};

export function AdminEditorialTable({ articles }: Props) {
  if (!articles.length) {
    return <div className="empty-dashboard-state" data-i18n="noArticlesYet">Todavia no hay articulos. Crea el primer capitulo desde Nuevo articulo.</div>;
  }

  return (
    <div className="editorial-table-wrap">
      <table className="editorial-table">
        <thead>
          <tr>
            <th data-i18n="chapterArticle">Capitulo / Articulo</th>
            <th data-i18n="publishDate">Fecha de publicacion</th>
            <th data-i18n="readTime">Tiempo de lectura</th>
            <th data-i18n="status">Estado</th>
            <th aria-label="Acciones" data-i18n-aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {articles.slice(0, 10).map((article) => (
            <tr key={article.id}>
              <td data-label="Capitulo / Articulo">
                <div className="editorial-table-title">
                  <img src={article.coverImage || "/images/cap1-off.webp"} alt="" />
                  <div>
                    <strong>{getPlainTextPreview(article.title, 150)}</strong>
                    <span>{article.category}</span>
                  </div>
                </div>
              </td>
              <td data-label="Fecha de publicacion">{formatDate(article.publishedAt)}</td>
              <td data-label="Tiempo de lectura">{article.readTime}</td>
              <td data-label="Estado">
                <div className="editorial-status-stack">
                  <span className={article.status === "published" ? "status-pill published" : "status-pill draft"} data-i18n={article.status === "published" ? "published" : "draft"}>
                    {article.status === "published" ? "Publicado" : "Draft"}
                  </span>
                  {article.featured ? <span className="status-pill featured" data-i18n="featured">Destacado</span> : null}
                </div>
              </td>
              <td data-label="Acciones">
                <div className="editorial-table-actions">
                  {article.status === "published" ? (
                    <Link className="table-action-button" href={`/off/${article.slug}`} target="_blank" data-i18n="view">
                      Ver
                    </Link>
                  ) : <span className="table-action-button disabled" data-i18n="view">Ver</span>}
                  <Link className="table-action-button" href={`/admin/${article.id}`} data-i18n="edit">
                    Editar
                  </Link>
                  <DeleteArticleButton articleId={article.id} compact />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
