import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MembershipWelcome } from "@/components/MembershipWelcome";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  return (
    <>
      <div className="welcome-language"><LanguageSwitcher /></div>
      <MembershipWelcome memberSince={user.createdAt.toISOString()} memberNumber={memberNumber(position)} />
    </>
  );
}
