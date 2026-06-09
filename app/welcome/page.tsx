import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MembershipWelcome } from "@/components/MembershipWelcome";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

function memberNumber(value: number) {
  return String(value).padStart(6, "0");
}

export const metadata: Metadata = {
  title: "Estás dentro | OFF",
  robots: { index: false, follow: false },
};

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  const position = await getDb().user.count({ where: { createdAt: { lte: user.createdAt } } });
  const memberSince = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(user.createdAt);

  return <MembershipWelcome memberSince={memberSince} memberNumber={memberNumber(position)} />;
}
