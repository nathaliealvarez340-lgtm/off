import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanSocialText } from "@/lib/community";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const TARGETS = new Set(["COMMUNITY_POST", "COMMUNITY_COMMENT", "GALLERY_COMMENT"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("social-report", user.id, 8, 60 * 60_000)) return NextResponse.json({ success: false, error: "Ya enviaste varios reportes." }, { status: 429 });
  const body = await request.json().catch(() => null) as { targetType?: unknown; targetId?: unknown; reason?: unknown } | null;
  const targetType = typeof body?.targetType === "string" ? body.targetType : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if (!TARGETS.has(targetType) || !targetId) return NextResponse.json({ success: false, error: "Reporte inválido." }, { status: 400 });
  await getDb().socialReport.create({ data: { reporterId: user.id, targetType, targetId, reason: cleanSocialText(body?.reason, 300) || null } });
  return NextResponse.json({ success: true });
}
