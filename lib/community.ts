import type { ConnectionStatus, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { earnedBadges } from "@/lib/member-progress";

export const COMMUNITY_POST_LIMIT = 800;
export const COMMUNITY_COMMENT_LIMIT = 1000;

export function cleanSocialText(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, limit)
    : "";
}

export function connectionPairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

export function memberOffId(memberNumber?: number | null) {
  return memberNumber ? `OFF #${String(memberNumber).padStart(4, "0")}` : "OFF Member";
}

export type CommunityMemberData = {
  id: string;
  name: string;
  offId: string;
  memberSince: string;
  badges: string[];
  completedCount: number;
  latestAchievement: { id: string; title: string; achievedAt: string } | null;
  connectionStatus: ConnectionStatus | "NONE";
  connectionDirection: "INCOMING" | "OUTGOING" | null;
};

export type SocialCommentData = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  user: { id: string; name: string; offId: string };
  likeCount: number;
  likedByViewer: boolean;
  canDelete: boolean;
  replyCount: number;
  replies: SocialCommentData[];
};

export type CommunityFeedItem = {
  id: string;
  kind: "THOUGHT" | "ACHIEVEMENT";
  createdAt: string;
  user: { id: string; name: string; offId: string; badges: string[] };
  content: string;
  imageUrl: string | null;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  comments: SocialCommentData[];
  canDelete: boolean;
};

const memberSelect = {
  id: true,
  name: true,
  createdAt: true,
  memberProfile: { select: { memberNumber: true } },
  _count: { select: { completions: true } },
  achievements: { orderBy: { achievedAt: "desc" }, take: 1, select: { id: true, title: true, achievedAt: true } },
} satisfies Prisma.UserSelect;

export async function syncMemberAchievements(userId: string) {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, _count: { select: { completions: true } } },
  });
  if (!user) return;

  const achievements: Array<{ type: string; title: string; metadata?: Prisma.InputJsonValue }> = [];
  if (user._count.completions >= 1) achievements.push({ type: "FIRST_EDITION", title: "Completó su primera edición.", metadata: { completedCount: user._count.completions } });
  if (user._count.completions >= 5) achievements.push({ type: "FIVE_ARTICLES", title: "Completó cinco capítulos de OFF.", metadata: { completedCount: user._count.completions } });
  if (Date.now() - user.createdAt.getTime() >= 365 * 24 * 60 * 60 * 1000) achievements.push({ type: "FIRST_ANNIVERSARY", title: "Cumplió un año como miembro de OFF." });

  await Promise.all(achievements.map((achievement) => db.memberAchievement.upsert({
    where: { key: `${userId}:${achievement.type}` },
    create: { key: `${userId}:${achievement.type}`, userId, ...achievement },
    update: { title: achievement.title, metadata: achievement.metadata },
  })));
}

function serializeMember(
  member: Prisma.UserGetPayload<{ select: typeof memberSelect }>,
  connection?: { requesterId: string; receiverId: string; status: ConnectionStatus } | null,
  viewerId?: string,
): CommunityMemberData {
  const latest = member.achievements[0];
  return {
    id: member.id,
    name: member.name,
    offId: memberOffId(member.memberProfile?.memberNumber),
    memberSince: member.createdAt.toISOString(),
    badges: earnedBadges(member._count.completions),
    completedCount: member._count.completions,
    latestAchievement: latest ? { id: latest.id, title: latest.title, achievedAt: latest.achievedAt.toISOString() } : null,
    connectionStatus: connection?.status ?? "NONE",
    connectionDirection: !connection || !viewerId ? null : connection.receiverId === viewerId ? "INCOMING" : "OUTGOING",
  };
}

export async function getCommunityMembers(viewerId: string, query = "", take = 8) {
  const db = getDb();
  const normalized = cleanSocialText(query, 60);
  const memberNumber = Number.parseInt(normalized.replace(/\D/g, ""), 10);
  const blockedRows = await db.memberBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blockedRows.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId);
  const members = await db.user.findMany({
    where: {
      id: { notIn: [viewerId, ...blockedIds] },
      role: "USER",
      ...(normalized ? {
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          ...(Number.isFinite(memberNumber) ? [{ memberProfile: { is: { memberNumber } } }] : []),
        ],
      } : {}),
    },
    select: memberSelect,
    orderBy: { createdAt: "desc" },
    take: Math.min(20, Math.max(1, take)),
  });
  const connections = await db.memberConnection.findMany({
    where: { pairKey: { in: members.map((member) => connectionPairKey(viewerId, member.id)) } },
    select: { pairKey: true, requesterId: true, receiverId: true, status: true },
  });
  const connectionMap = new Map(connections.map((connection) => [connection.pairKey, connection]));
  return members.map((member) => serializeMember(member, connectionMap.get(connectionPairKey(viewerId, member.id)), viewerId));
}

export async function getCommunityMemberProfile(viewerId: string, memberId: string) {
  const db = getDb();
  const blocked = await db.memberBlock.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: memberId }, { blockerId: memberId, blockedId: viewerId }] }, select: { id: true } });
  if (blocked) return null;
  const [member, connection, posts, achievements, connectionCount] = await Promise.all([
    db.user.findFirst({ where: { id: memberId, role: "USER" }, select: memberSelect }),
    db.memberConnection.findUnique({ where: { pairKey: connectionPairKey(viewerId, memberId) }, select: { requesterId: true, receiverId: true, status: true } }),
    db.communityPost.findMany({ where: { userId: memberId, status: "published" }, select: { id: true, content: true, imageUrl: true, createdAt: true, _count: { select: { likes: true, comments: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.memberAchievement.findMany({ where: { userId: memberId }, select: { id: true, title: true, achievedAt: true, _count: { select: { reactions: true } } }, orderBy: { achievedAt: "desc" }, take: 8 }),
    db.memberConnection.count({ where: { status: "CONNECTED", OR: [{ requesterId: memberId }, { receiverId: memberId }] } }),
  ]);
  if (!member) return null;
  return {
    member: serializeMember(member, connection, viewerId),
    connectionCount,
    posts: posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() })),
    achievements: achievements.map((achievement) => ({ id: achievement.id, title: achievement.title, achievedAt: achievement.achievedAt.toISOString(), reactionCount: achievement._count.reactions })),
  };
}

type CommunityPostRow = Prisma.CommunityPostGetPayload<{
  include: {
    user: { select: typeof memberSelect };
    likes: { select: { userId: true } };
    _count: { select: { likes: true; comments: true } };
    comments: {
      include: {
        user: { select: { id: true; name: true; memberProfile: { select: { memberNumber: true } } } };
        likes: { select: { userId: true } };
        _count: { select: { replies: true; likes: true } };
        replies: {
          include: {
            user: { select: { id: true; name: true; memberProfile: { select: { memberNumber: true } } } };
            likes: { select: { userId: true } };
            _count: { select: { replies: true; likes: true } };
          };
        };
      };
    };
  };
}>;

function serializeComment(comment: CommunityPostRow["comments"][number], viewerId: string, canModerate: boolean): SocialCommentData {
  const serializeReply = (reply: CommunityPostRow["comments"][number]["replies"][number]): SocialCommentData => ({
    id: reply.id,
    parentId: reply.parentId,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    user: { id: reply.user.id, name: reply.user.name, offId: memberOffId(reply.user.memberProfile?.memberNumber) },
    likeCount: reply._count.likes,
    likedByViewer: reply.likes.some((like) => like.userId === viewerId),
    canDelete: canModerate || reply.userId === viewerId,
    replyCount: reply._count.replies,
    replies: [],
  });
  return {
    id: comment.id,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: { id: comment.user.id, name: comment.user.name, offId: memberOffId(comment.user.memberProfile?.memberNumber) },
    likeCount: comment._count.likes,
    likedByViewer: comment.likes.some((like) => like.userId === viewerId),
    canDelete: canModerate || comment.userId === viewerId,
    replyCount: comment._count.replies,
    replies: comment.replies.map(serializeReply),
  };
}

export async function getCommunityFeed(viewerId: string, role: string, tab = "for-you", offset = 0, take = 15) {
  const db = getDb();
  const limit = Math.min(20, Math.max(1, take));
  const connectedRows = await db.memberConnection.findMany({
    where: { status: "CONNECTED", OR: [{ requesterId: viewerId }, { receiverId: viewerId }] },
    select: { requesterId: true, receiverId: true },
  });
  const connectedIds = connectedRows.map((row) => row.requesterId === viewerId ? row.receiverId : row.requesterId);
  const blockedRows = await db.memberBlock.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } });
  const blockedIds = blockedRows.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId);

  const postRows = tab === "achievements" ? [] : await db.communityPost.findMany({
    where: { status: "published", userId: { notIn: blockedIds } },
    include: {
      user: { select: memberSelect },
      likes: { where: { userId: viewerId }, select: { userId: true } },
      _count: { select: { likes: true, comments: { where: { status: "PUBLISHED" } } } },
      comments: {
        where: { status: "PUBLISHED", parentId: null },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } },
          likes: { where: { userId: viewerId }, select: { userId: true } },
          _count: { select: { replies: true, likes: true } },
          replies: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "asc" },
            take: 3,
            include: {
              user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } },
              likes: { where: { userId: viewerId }, select: { userId: true } },
              _count: { select: { replies: true, likes: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: Math.max(0, offset),
    take: limit + 1,
  });

  const achievementRows = tab === "conversations" ? [] : await db.memberAchievement.findMany({
    where: { userId: { notIn: blockedIds } },
    include: {
      user: { select: memberSelect },
      reactions: { where: { userId: viewerId }, select: { userId: true } },
      _count: { select: { reactions: true } },
    },
    orderBy: { achievedAt: "desc" },
    skip: tab === "achievements" ? Math.max(0, offset) : 0,
    take: tab === "achievements" ? limit + 1 : Math.max(5, Math.ceil(limit / 3)),
  });

  const postItems: CommunityFeedItem[] = postRows.slice(0, limit).map((post) => ({
    id: post.id,
    kind: "THOUGHT",
    createdAt: post.createdAt.toISOString(),
    user: { id: post.user.id, name: post.user.name, offId: memberOffId(post.user.memberProfile?.memberNumber), badges: earnedBadges(post.user._count.completions) },
    content: post.content,
    imageUrl: post.imageUrl,
    likeCount: post._count.likes,
    likedByViewer: post.likes.length > 0,
    commentCount: post._count.comments,
    comments: post.comments.map((comment) => serializeComment(comment, viewerId, role === "ADMIN")),
    canDelete: role === "ADMIN" || post.userId === viewerId,
  }));
  const achievementItems: CommunityFeedItem[] = achievementRows.slice(0, limit).map((achievement) => ({
    id: achievement.id,
    kind: "ACHIEVEMENT",
    createdAt: achievement.achievedAt.toISOString(),
    user: { id: achievement.user.id, name: achievement.user.name, offId: memberOffId(achievement.user.memberProfile?.memberNumber), badges: earnedBadges(achievement.user._count.completions) },
    content: achievement.title,
    imageUrl: null,
    likeCount: achievement._count.reactions,
    likedByViewer: achievement.reactions.length > 0,
    commentCount: 0,
    comments: [],
    canDelete: role === "ADMIN",
  }));

  const items = [...postItems, ...achievementItems].sort((a, b) => {
    const connectionBoostA = connectedIds.includes(a.user.id) ? 1 : 0;
    const connectionBoostB = connectedIds.includes(b.user.id) ? 1 : 0;
    if (tab === "for-you" && connectionBoostA !== connectionBoostB) return connectionBoostB - connectionBoostA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, limit);
  return { items, hasMore: postRows.length > limit || achievementRows.length > limit };
}
