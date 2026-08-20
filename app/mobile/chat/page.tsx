import type { Metadata } from "next";
import { ChatAssistantScreen } from "@/mobile/ChatAssistantScreen";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chat OFF",
  robots: { index: false, follow: false },
};

export default async function MobileChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mobile/chat");
  return <ChatAssistantScreen preferredLanguage={user.preferredLanguage} />;
}
