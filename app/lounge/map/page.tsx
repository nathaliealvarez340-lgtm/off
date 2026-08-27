import { redirect } from "next/navigation";
import { GlobalSearchOverlay } from "@/components/GlobalSearchOverlay";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { PersonalMapExperience } from "@/components/PersonalMapExperience";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPersonalMap } from "@/lib/personal-map";
import { normalizeUiLanguage } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";
export default async function PersonalMapPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login?next=/lounge/map"); const language = normalizeUiLanguage(user.preferredLanguage); const db = getDb();
  const [map, highlights, rituals] = await Promise.all([getPersonalMap(user.id, language), db.articleHighlight.findMany({ where: { userId: user.id }, include: { article: { select: { title: true, slug: true } } }, orderBy: { updatedAt: "desc" }, take: 80 }), db.ritualResponse.findMany({ where: { userId: user.id }, include: { ritual: { select: { prompt: true } } }, orderBy: { updatedAt: "desc" }, take: 40 })]);
  return <div className="off-community-page"><PersonalMapExperience signals={map.signals} highlights={highlights.map((item) => ({ id: item.id, selectedText: item.selectedText, note: item.note, updatedAt: item.updatedAt.toISOString(), article: item.article }))} rituals={rituals.map((item) => ({ id: item.id, content: item.content, updatedAt: item.updatedAt.toISOString(), ritual: item.ritual }))} language={language} /><GlobalSearchOverlay initialLanguage={language} /><LoungeBottomNavigation activeSection="map" initialLanguage={language} /></div>;
}
