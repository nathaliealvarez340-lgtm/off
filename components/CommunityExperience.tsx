"use client";

import { Award, Heart, ImagePlus, MoreHorizontal, Search, Send, Sparkles, UserPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThreadedComments } from "@/components/ThreadedComments";
import { communityCopy } from "@/lib/community-i18n";
import type { CommunityFeedItem, CommunityMemberData } from "@/lib/community";
import type { UiLanguage } from "@/lib/ui-i18n";
import { useOffLanguage } from "@/components/useOffLanguage";

type CommunityTab = "for-you" | "achievements" | "conversations";

export function CommunityExperience({ initialFeed, initialMembers, initialHasMore, initialLanguage }: {
  initialFeed: CommunityFeedItem[];
  initialMembers: CommunityMemberData[];
  initialHasMore: boolean;
  initialLanguage: UiLanguage;
}) {
  const { language } = useOffLanguage(initialLanguage);
  const copy = communityCopy[language];
  const [tab, setTab] = useState<CommunityTab>("for-you");
  const [feed, setFeed] = useState(initialFeed);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [thought, setThought] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("off-community-tab") as CommunityTab | null;
    if (stored && stored !== "for-you" && ["achievements", "conversations"].includes(stored)) void changeTab(stored);
  // Restore once; subsequent changes are controlled by the tabs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeTab(next: CommunityTab) {
    if (next === tab) return;
    setTab(next);
    window.sessionStorage.setItem("off-community-tab", next);
    setLoading(true);
    const response = await fetch(`/api/community?tab=${next}&offset=0`);
    const data = await response.json().catch(() => null) as { items?: CommunityFeedItem[]; hasMore?: boolean } | null;
    if (response.ok) { setFeed(data?.items ?? []); setHasMore(Boolean(data?.hasMore)); }
    else setMessage(copy.actionError);
    setLoading(false);
  }

  async function publishThought() {
    if (thought.trim().length < 2) return;
    setLoading(true);
    const response = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: thought, imageUrl }) });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (response.ok) {
      setThought(""); setImageUrl(null); setMessage(copy.thoughtPublished);
      const refresh = await fetch(`/api/community?tab=${tab}&offset=0`);
      const refreshed = await refresh.json() as { items: CommunityFeedItem[]; hasMore: boolean };
      setFeed(refreshed.items); setHasMore(refreshed.hasMore);
    } else setMessage(data?.error || copy.actionError);
    setLoading(false);
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    const body = new FormData(); body.set("file", file); body.set("kind", "image");
    setLoading(true);
    const response = await fetch("/api/community/upload", { method: "POST", body });
    const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    if (response.ok && data?.url) setImageUrl(data.url); else setMessage(data?.error || copy.actionError);
    setLoading(false);
  }

  async function toggleReaction(item: CommunityFeedItem) {
    const endpoint = item.kind === "THOUGHT" ? `/api/community/${item.id}/like` : `/api/community/achievements/${item.id}/react`;
    const old = item;
    setFeed((items) => items.map((entry) => entry.id === item.id ? { ...entry, likedByViewer: !entry.likedByViewer, likeCount: Math.max(0, entry.likeCount + (entry.likedByViewer ? -1 : 1)) } : entry));
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) { setFeed((items) => items.map((entry) => entry.id === item.id ? old : entry)); setMessage(copy.actionError); }
  }

  async function removePost(item: CommunityFeedItem) {
    const response = await fetch("/api/community", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    if (response.ok) setFeed((items) => items.filter((entry) => entry.id !== item.id)); else setMessage(copy.actionError);
  }

  async function reportPost(item: CommunityFeedItem) {
    const response = await fetch("/api/community/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType: "COMMUNITY_POST", targetId: item.id }) });
    setMessage(response.ok ? "Reporte enviado." : copy.actionError);
  }

  async function loadMore() {
    setLoading(true);
    const response = await fetch(`/api/community?tab=${tab}&offset=${feed.length}`);
    const data = await response.json().catch(() => null) as { items?: CommunityFeedItem[]; hasMore?: boolean } | null;
    if (response.ok) { setFeed((items) => [...items, ...(data?.items ?? [])]); setHasMore(Boolean(data?.hasMore)); }
    setLoading(false);
  }

  async function searchMembers() {
    const response = await fetch(`/api/community/members?q=${encodeURIComponent(query)}`);
    const data = await response.json().catch(() => null) as { members?: CommunityMemberData[] } | null;
    if (response.ok) setMembers(data?.members ?? []);
  }

  async function connection(member: CommunityMemberData, action: "request" | "accept" | "ignore") {
    const response = await fetch("/api/community/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: member.id, action }) });
    const data = await response.json().catch(() => null) as { status?: CommunityMemberData["connectionStatus"]; error?: string } | null;
    if (response.ok && data?.status) setMembers((items) => items.map((entry) => entry.id === member.id ? { ...entry, connectionStatus: data.status!, connectionDirection: action === "request" ? "OUTGOING" : null } : entry));
    else setMessage(data?.error || copy.actionError);
  }

  async function greet(member: CommunityMemberData) {
    const response = await fetch("/api/community/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: member.id }) });
    setMessage(response.ok ? `${copy.greet}: ${member.name}` : copy.actionError);
  }

  return (
    <main className="off-community-shell">
      <header className="off-community-hero"><div><p>THE MEMBER LOUNGE</p><h1>{copy.community}</h1><span>Ideas honestas, logros reales y personas construyéndose en compañía.</span></div><UsersRound aria-hidden="true" /></header>
      <div className="off-community-layout">
        <aside className="off-community-filters" aria-label={copy.community}>
          {(["for-you", "achievements", "conversations"] as CommunityTab[]).map((value) => <button className={tab === value ? "is-active" : ""} type="button" onClick={() => changeTab(value)} key={value}>{value === "for-you" ? <Sparkles /> : value === "achievements" ? <Award /> : <UsersRound />}<span>{value === "for-you" ? copy.forYou : value === "achievements" ? copy.achievements : copy.conversations}</span></button>)}
        </aside>
        <section className="off-community-feed">
          <article className="off-community-composer">
            <textarea value={thought} onChange={(event) => setThought(event.target.value.slice(0, 800))} placeholder={copy.thinking} rows={3} />
            {imageUrl ? <div className="off-community-image-preview"><img src={imageUrl} alt="" /><button type="button" onClick={() => setImageUrl(null)} aria-label={copy.removeImage}><X /></button></div> : null}
            <footer><span>{thought.length}/800</span><input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => uploadImage(event.target.files?.[0])} /><button type="button" onClick={() => imageInputRef.current?.click()} aria-label={copy.image}><ImagePlus /></button><button type="button" onClick={publishThought} disabled={loading || thought.trim().length < 2}><Send />{copy.publish}</button></footer>
          </article>
          {loading && feed.length === 0 ? <div className="off-community-skeleton" aria-label="Loading"><i /><i /><i /></div> : null}
          {!loading && feed.length === 0 ? <p className="off-community-empty">{copy.empty}</p> : null}
          {feed.map((item) => <article className={`off-community-card is-${item.kind.toLowerCase()}`} key={`${item.kind}-${item.id}`}>
            <header><Link href={`/lounge/community/member/${item.user.id}`}><span>{item.user.name.slice(0, 1)}</span><div><strong>{item.user.name}</strong><small>{item.user.offId}</small></div></Link><time>{new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(new Date(item.createdAt))}</time><div className="off-community-card-menu"><MoreHorizontal /><span>{item.canDelete ? <button type="button" onClick={() => removePost(item)}>{copy.delete}</button> : null}<button type="button" onClick={() => reportPost(item)}>{copy.report}</button></span></div></header>
            {item.kind === "ACHIEVEMENT" ? <div className="off-achievement-content"><Award /><p><strong>{item.user.name}</strong> {item.content}</p></div> : <p className="off-community-thought">{item.content}</p>}
            {item.imageUrl ? <img className="off-community-post-image" src={item.imageUrl} alt="" /> : null}
            <div className="off-community-reactions"><button className={item.likedByViewer ? "is-active" : ""} type="button" onClick={() => toggleReaction(item)}><Heart fill={item.likedByViewer ? "currentColor" : "none"} />{item.likeCount}</button>{item.kind === "ACHIEVEMENT" ? <button type="button" onClick={() => toggleReaction(item)}>{copy.congratulate}</button> : <span>{item.commentCount} {copy.comments.toLowerCase()}</span>}</div>
            {item.kind === "THOUGHT" ? <ThreadedComments endpoint={`/api/community/${item.id}/comments`} initialComments={item.comments} initialCount={item.commentCount} language={language} allowLikes reportType="COMMUNITY_COMMENT" compact /> : null}
          </article>)}
          {hasMore ? <button className="off-community-load-more" type="button" onClick={loadMore} disabled={loading}>{copy.loadMore}</button> : null}
        </section>
        <aside className="off-community-members">
          <h2>{copy.searchMembers}</h2><form onSubmit={(event) => { event.preventDefault(); searchMembers(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchMembers} /><button type="submit" aria-label={copy.searchMembers}><Search /></button></form>
          <div>{members.length === 0 ? <p>{copy.noMembers}</p> : members.map((member) => <article key={member.id}><Link href={`/lounge/community/member/${member.id}`}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.offId}</small></div></Link>{member.badges[0] ? <em>{member.badges[0]}</em> : null}{member.latestAchievement ? <p>{member.latestAchievement.title}</p> : null}<footer><button type="button" onClick={() => greet(member)}>{copy.greet}</button>{member.connectionStatus === "NONE" || member.connectionStatus === "DECLINED" ? <button type="button" onClick={() => connection(member, "request")}><UserPlus />{copy.connect}</button> : member.connectionStatus === "PENDING" && member.connectionDirection === "INCOMING" ? <><button type="button" onClick={() => connection(member, "accept")}>{copy.accept}</button><button type="button" onClick={() => connection(member, "ignore")}>{copy.ignore}</button></> : <span>{member.connectionStatus === "CONNECTED" ? copy.connected : copy.sent}</span>}</footer></article>)}</div>
        </aside>
      </div>
      {message ? <button className="off-community-toast" type="button" onClick={() => setMessage("")}>{message}</button> : null}
    </main>
  );
}
