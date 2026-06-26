import type { LoungeContentType } from "@prisma/client";
import { notFound } from "next/navigation";
import { LoungeContentEditor } from "@/components/LoungeContentEditor";
import { requireAdmin } from "@/lib/auth";

const TYPES = ["LIBRARY", "SIGNAL", "RESOURCE", "NATHALIE_NOTE", "EARLY_ACCESS"] as const;

export default async function NewLoungeContentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  if (!type || !TYPES.includes(type as (typeof TYPES)[number])) notFound();
  return <LoungeContentEditor type={type as LoungeContentType} />;
}
