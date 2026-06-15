import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "USER") return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null) as { seconds?: unknown } | null;
  const seconds = typeof body?.seconds === "number" ? Math.round(body.seconds) : 0;
  if (seconds < 1 || seconds > 60) return NextResponse.json({ ok: false, error: "Intervalo inválido." }, { status: 400 });

  const activity = await getDb().memberActivity.upsert({
    where: { userId: user.id },
    update: { totalSeconds: { increment: seconds } },
    create: { userId: user.id, totalSeconds: seconds },
  });

  return NextResponse.json({ ok: true, totalSeconds: activity.totalSeconds });
}
