import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ success: false }, { status: 401 }); const { id } = await params; const db = getDb(); const existing = await db.editorialConversationReplyLike.findUnique({ where: { replyId_userId: { replyId: id, userId: user.id } } }); if (existing) await db.editorialConversationReplyLike.delete({ where: { id: existing.id } }); else await db.editorialConversationReplyLike.create({ data: { replyId: id, userId: user.id } }); return NextResponse.json({ success: true, liked: !existing }); }
