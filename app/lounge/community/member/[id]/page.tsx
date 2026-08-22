import { ArrowLeft, Award, Heart, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommunityProfileActions } from "@/components/CommunityProfileActions";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { getCurrentUser } from "@/lib/auth";
import { communityCopy } from "@/lib/community-i18n";
import { getCommunityMemberProfile } from "@/lib/community";
import { normalizeUiLanguage } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";

export default async function CommunityMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lounge/community");
  const { id } = await params;
  const profile = await getCommunityMemberProfile(user.id, id);
  if (!profile) notFound();
  const language = normalizeUiLanguage(user.preferredLanguage);
  const copy = communityCopy[language];
  return <div className="off-community-page"><main className="off-community-profile">
    <Link className="off-community-back" href="/lounge/community"><ArrowLeft />{copy.back}</Link>
    <header><span className="off-community-profile-avatar">{profile.member.name.slice(0, 1)}</span><div><p>{profile.member.offId}</p><h1>{profile.member.name}</h1><span>{copy.memberSince} {new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(new Date(profile.member.memberSince))}</span></div><CommunityProfileActions member={profile.member} language={language} /></header>
    <section className="off-community-profile-stats"><span><UsersRound />{profile.connectionCount}<small>{copy.connected}</small></span><span><Award />{profile.achievements.length}<small>{copy.achievements}</small></span>{profile.member.badges.map((badge) => <em key={badge}>{badge}</em>)}</section>
    <div className="off-community-profile-grid"><section><h2>{copy.achievements}</h2>{profile.achievements.length ? profile.achievements.map((achievement) => <article key={achievement.id}><Award /><div><strong>{achievement.title}</strong><time>{new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" }).format(new Date(achievement.achievedAt))}</time></div><span><Heart />{achievement.reactionCount}</span></article>) : <p>{copy.noActivity}</p>}</section><section><h2>{copy.recentThoughts}</h2>{profile.posts.length ? profile.posts.map((post) => <article key={post.id}><p>{post.content}</p>{post.imageUrl ? <img src={post.imageUrl} alt="" /> : null}<footer><time>{new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(new Date(post.createdAt))}</time><span><Heart />{post._count.likes}</span><span>{post._count.comments} {copy.comments.toLowerCase()}</span></footer></article>) : <p>{copy.noActivity}</p>}</section></div>
  </main><LoungeBottomNavigation activeSection="community" initialLanguage={language} /></div>;
}
