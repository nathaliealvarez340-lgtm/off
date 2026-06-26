import type { Metadata } from "next";
import { ChatAssistantScreen } from "@/mobile/ChatAssistantScreen";

export const metadata: Metadata = {
  title: "Chat OFF",
  robots: { index: false, follow: false },
};

export default function MobileChatPage() {
  return <ChatAssistantScreen />;
}
