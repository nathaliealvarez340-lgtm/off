import { redirect } from "next/navigation";
import { CommunityExperience } from "@/components/CommunityExperience";
import { GlobalSearchOverlay } from "@/components/GlobalSearchOverlay";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityFeed, getCommunityMembers, syncMemberAchievements } from "@/lib/community";
import { normalizeUiLanguage } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/lounge/community")}`);
  await syncMemberAchievements(user.id);
  const [feed, members] = await Promise.all([
    getCommunityFeed(user.id, user.role, "for-you", 0, 15),
    getCommunityMembers(user.id, "", 8),
  ]);
  const language = normalizeUiLanguage(user.preferredLanguage);
  return (
    <div className="off-community-page">
      <CommunityExperience initialFeed={feed.items} initialMembers={members} initialHasMore={feed.hasMore} initialLanguage={language} />
      <GlobalSearchOverlay initialLanguage={language} />
      <LoungeBottomNavigation activeSection="community" initialLanguage={language} />
    </div>
  );
}
