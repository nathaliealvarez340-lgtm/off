import { notFound } from "next/navigation";
import { LoungeContentEditor } from "@/components/LoungeContentEditor";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function EditLoungeContentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await getDb().loungeContent.findUnique({ where: { id } });
  if (!item) notFound();
  return <LoungeContentEditor item={item} type={item.type} />;
}
