"use client";

import Link from "next/link";
import { deleteGalleryPostAction, toggleGalleryPostStatusAction } from "@/app/actions";

export function GalleryAdminActions({ id, status }: { id: string; status: string }) {
  return (
    <div className="admin-gallery-actions">
      <Link className="button" href={`/admin/content/${id}`}>Editar</Link>
      <form action={toggleGalleryPostStatusAction}><input name="id" type="hidden" value={id} /><button type="submit">{status === "published" ? "Despublicar" : "Publicar"}</button></form>
      <form action={deleteGalleryPostAction}><input name="id" type="hidden" value={id} /><button className="danger" type="submit" onClick={(event) => { if (!window.confirm("¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.")) event.preventDefault(); }}>Eliminar</button></form>
    </div>
  );
}
