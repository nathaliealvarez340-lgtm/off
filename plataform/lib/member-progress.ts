import { getDb } from "./db";

const badgeThresholds = [
  ["Starter", 1],
  ["Seeker", 3],
  ["Architect", 7],
  ["Builder", 10],
  ["Curator", 15],
  ["Strategist", 20],
  ["Inner Circle", 30],
  ["Visionary", 40],
  ["Legacy", 50],
  ["Unstoppable", 75],
] as const;

const completionMessages: Record<string, string> = {
  vida: "Hoy no avanzaste por ruido. Avanzaste por dirección.",
  negocios: "Construir también es saber cuándo detenerse a pensar mejor.",
  crecimiento: "No se trata de hacerlo todo. Se trata de volver a ti con más claridad.",
  sociedad: "Entender el mundo también empieza por entender cómo te atraviesa.",
  tips: "Lo pequeño también construye estructura.",
};

export function earnedBadges(completedCount: number) {
  return badgeThresholds.filter(([, threshold]) => completedCount >= threshold).map(([name]) => name);
}

export function completionMessage(category: string) {
  return completionMessages[category.trim().toLowerCase()] ?? "Terminaste una lectura. Quédate un momento con lo que cambió.";
}

export function formatActiveTime(totalSeconds: number) {
  if (totalSeconds <= 0) return "Aún sin registro";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (!hours) return `${Math.max(1, minutes)}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export async function getOrCreateMemberNumber(userId: string) {
  const db = getDb();
  const existing = await db.memberProfile.findUnique({ where: { userId } });
  if (existing) return existing.memberNumber;

  const highest = await db.memberProfile.aggregate({ _max: { memberNumber: true } });
  const memberNumber = Math.max(2555, highest._max.memberNumber ?? 2555) + 1;
  try {
    const profile = await db.memberProfile.create({ data: { userId, memberNumber } });
    return profile.memberNumber;
  } catch {
    const profile = await db.memberProfile.findUnique({ where: { userId } });
    if (profile) return profile.memberNumber;
    throw new Error("No pudimos asignar el número de miembro.");
  }
}
