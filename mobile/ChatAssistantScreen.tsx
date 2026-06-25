"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { type ChatMessage, sendMessage } from "@/mobile/chatService";
import { mobileEase } from "@/mobile/mobileCopy";

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola, soy tu asistente OFF. Estoy aquí para ayudarte a ordenar ideas, entender lo que estás sintiendo y convertirlo en claridad accionable.",
};

export function ChatAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
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
        <Link href="/lounge" aria-label="Volver al lounge">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <img src="/logo/logo-off.png" alt="OFF" />
        <span>Chat</span>
      </nav>

      <section className="mobile-chat-messages" aria-live="polite">
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
        {pending ? <div className="mobile-chat-bubble assistant is-pending">Ordenando la idea...</div> : null}
      </section>

      <form className="mobile-chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escribe lo que quieres ordenar..."
          aria-label="Mensaje para el asistente OFF"
        />
        <button type="submit" disabled={pending || !input.trim()} aria-label="Enviar">
          <Send aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
