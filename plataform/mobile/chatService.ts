"use client";

export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export async function sendMessage(message: string): Promise<ChatMessage> {
  const trimmed = message.trim();
  await new Promise((resolve) => window.setTimeout(resolve, 420));

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: trimmed
      ? "Te leo. Por ahora puedo ayudarte a ordenar la idea en una pregunta mas clara: que parte de esto necesita direccion, descanso o una decision?"
      : "Cuéntame una idea, una tensión o una pregunta. La convertimos en claridad accionable.",
  };
}
