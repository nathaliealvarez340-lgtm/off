import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("member-search", user.id, 20, 60_000)) return NextResponse.json({ success: false, error: "Demasiadas búsquedas. Intenta en un momento." }, { status: 429 });
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (query.length < 2) return NextResponse.json({ success: true, members: [] });
  const memberNumber = Number.parseInt(query.replace(/\D/g, ""), 10);
  const members = await getDb().user.findMany({
    where: {
      id: { not: user.id },
      role: "USER",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        ...(Number.isFinite(memberNumber) ? [{ memberProfile: { is: { memberNumber } } }] : []),
      ],
    },
    select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } },
    take: 6,
  });
  return NextResponse.json({ success: true, members: members.map((member) => ({ id: member.id, name: member.name, offId: member.memberProfile ? `OFF #${String(member.memberProfile.memberNumber).padStart(4, "0")}` : "OFF Member" })) });
}
