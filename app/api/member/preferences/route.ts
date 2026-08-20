import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizeUiLanguage } from "@/lib/ui-i18n";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const body = await request.json() as { language?: string };
    const language = normalizeUiLanguage(body.language ?? null);
    await getDb().user.update({ where: { id: user.id }, data: { preferredLanguage: language } });
    return NextResponse.json({ success: true, language });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
