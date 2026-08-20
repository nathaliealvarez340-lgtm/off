"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { type ChatMessage, sendMessage } from "@/mobile/chatService";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";

export function ChatAssistantScreen({ preferredLanguage }: { preferredLanguage?: string | null }) {
  const { copy } = useMobileCopy(preferredLanguage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);

    try {
      const response = await sendMessage(content);
      setMessages((current) => [...current, response]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="off-mobile mobile-chat-screen">
      <nav className="mobile-chat-header">
        <img src="/logo/logo-off.png" alt="OFF" />
        <span>Chat</span>
        <Link className="mobile-chat-back" href="/lounge" aria-label={copy.backToLounge}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </nav>

      <section className="mobile-chat-messages" aria-live="polite">
        <motion.article
          className="mobile-chat-bubble assistant"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: mobileEase, delay: 0.08 }}
        >
          {copy.chatWelcome}
        </motion.article>
        {messages.map((message, index) => (
          <motion.article
            className={`mobile-chat-bubble ${message.role}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: mobileEase, delay: index === 0 ? 0.08 : 0 }}
            key={message.id}
          >
            {message.content}
          </motion.article>
        ))}
        {pending ? <div className="mobile-chat-bubble assistant is-pending">{copy.chatPending}</div> : null}
      </section>

      <form className="mobile-chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={copy.chatPlaceholder}
          aria-label={copy.chatMessage}
        />
        <button type="submit" disabled={pending || !input.trim()} aria-label={copy.send}>
          <Send aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
