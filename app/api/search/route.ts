import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isGalleryCategory } from "@/lib/gallery";
import { galleryCategoryResults, searchOffContent } from "@/lib/off-search";
import { normalizeLocalizedArticleLanguage } from "@/lib/article-localization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const category = searchParams.get("category");
  const language = normalizeLocalizedArticleLanguage(searchParams.get("lang") ?? user.preferredLanguage);

  try {
    const results = isGalleryCategory(category)
      ? await galleryCategoryResults(category)
      : await searchOffContent(query, language);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("OFF search failed", error);
    return NextResponse.json({ success: false, error: "No pudimos completar la búsqueda." }, { status: 500 });
  }
}
