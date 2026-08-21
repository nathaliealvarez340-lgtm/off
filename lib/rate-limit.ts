import { createHash } from "crypto";
import { getDb } from "@/lib/db";

export async function consumeRateLimit(scope: string, actorId: string, limit: number, windowMs: number) {
  const key = createHash("sha256").update(`off:${scope}:${actorId}`).digest("hex");
  const db = getDb();
  const now = new Date();
  const current = await db.authThrottle.findUnique({ where: { key } });

  if (current?.lockedUntil && current.lockedUntil > now) return false;
  const windowExpired = !current || now.getTime() - current.updatedAt.getTime() > windowMs;
  if (windowExpired) {
    await db.authThrottle.upsert({
      where: { key },
      create: { key, attempts: 1, lockedUntil: null },
      update: { attempts: 1, lockedUntil: null },
    });
    return true;
  }

  if (current.attempts >= limit) {
    await db.authThrottle.update({ where: { key }, data: { lockedUntil: new Date(now.getTime() + windowMs) } });
    return false;
  }

  await db.authThrottle.update({ where: { key }, data: { attempts: { increment: 1 }, lockedUntil: null } });
  return true;
}
