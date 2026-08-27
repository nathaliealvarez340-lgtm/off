import { redirect } from "next/navigation";
import { CommunityExperience } from "@/components/CommunityExperience";
import { EditorialConversations } from "@/components/EditorialConversations";
import { GlobalSearchOverlay } from "@/components/GlobalSearchOverlay";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityFeed, getCommunityMembers, syncMemberAchievements } from "@/lib/community";
import { normalizeUiLanguage } from "@/lib/ui-i18n";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/lounge/community")}`);
  await syncMemberAchievements(user.id);
  const [feed, members, conversations] = await Promise.all([
    getCommunityFeed(user.id, user.role, "for-you", 0, 15),
    getCommunityMembers(user.id, "", 8),
    getDb().editorialConversation.findMany({ where: { status: "published", publishedAt: { lte: new Date() } }, select: { id: true, question: true, introduction: true, themes: true, closesAt: true, _count: { select: { replies: { where: { status: "PUBLISHED" } } } } }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 6 }),
  ]);
  const language = normalizeUiLanguage(user.preferredLanguage);
  return (
    <div className="off-community-page">
      <CommunityExperience initialFeed={feed.items} initialMembers={members} initialHasMore={feed.hasMore} initialLanguage={language} />
      <EditorialConversations conversations={conversations.map((item) => ({ id: item.id, question: item.question, introduction: item.introduction, themes: item.themes, closesAt: item.closesAt?.toISOString() ?? null, replyCount: item._count.replies }))} language={language} />
      <GlobalSearchOverlay initialLanguage={language} />
      <LoungeBottomNavigation activeSection="community" initialLanguage={language} />
    </div>
  );
}
