import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityMembers } from "@/lib/community";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-member-search", user.id, 30, 60_000)) return NextResponse.json({ success: false, error: "Demasiadas búsquedas." }, { status: 429 });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ success: true, members: await getCommunityMembers(user.id, query, 12) });
}
