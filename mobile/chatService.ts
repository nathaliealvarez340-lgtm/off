"use client";
export type ChatRole = "assistant" | "user";
export type ChatSource = { title: string; href: string };
export type ChatMessage = { id: string; role: ChatRole; content: string; sources?: ChatSource[] };
export async function sendMessage(message: string, conversationId: string | null, usePersonalContext: boolean): Promise<{ message: ChatMessage; conversationId: string }> { const response = await fetch("/api/ask-off", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, conversationId, usePersonalContext }) }); const data = await response.json().catch(() => null) as { message?: ChatMessage; conversationId?: string; error?: string } | null; if (!response.ok || !data?.message || !data.conversationId) throw new Error(data?.error || "Ask OFF no pudo responder."); return { message: data.message, conversationId: data.conversationId }; }
