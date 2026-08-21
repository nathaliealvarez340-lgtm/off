import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function EditGalleryPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  redirect(`/admin/content/${id}`);
}
