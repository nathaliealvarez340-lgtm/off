"use client";

import { deleteArticleAction } from "@/app/actions";

export function DeleteArticleButton({ articleId, compact = false }: { articleId: string; compact?: boolean }) {
  return (
    <form
      action={deleteArticleAction}
      onSubmit={(event) => {
        const confirmed = window.confirm("¿Seguro que quieres eliminar este artículo? Esta acción no se puede deshacer.");
        if (!confirmed) event.preventDefault();
      }}
    >
      <input name="id" type="hidden" value={articleId} />
      <button className={compact ? "delete-button compact" : "delete-button"} type="submit">
        Eliminar
      </button>
    </form>
  );
}
