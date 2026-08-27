"use client";

import { Highlighter, MessageSquareText, Share2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UiLanguage } from "@/lib/ui-i18n";

type Highlight = { id: string; selectedText: string; blockId: string | null; startOffset: number | null; endOffset: number | null; prefix: string | null; suffix: string | null; note: string | null };
type Draft = { selectedText: string; blockId: string; startOffset: number; endOffset: number; prefix: string; suffix: string };

const copy = {
  es: { highlight: "Subrayar", note: "Nota", share: "Compartir", addNote: "Añade una nota privada", remove: "Quitar subrayado", shared: "Compartido en Community." },
  en: { highlight: "Highlight", note: "Note", share: "Share", addNote: "Add a private note", remove: "Remove highlight", shared: "Shared to Community." },
  it: { highlight: "Sottolinea", note: "Nota", share: "Condividi", addNote: "Aggiungi una nota privata", remove: "Rimuovi sottolineatura", shared: "Condiviso in Community." },
  pt: { highlight: "Sublinhar", note: "Nota", share: "Compartilhar", addNote: "Adicione uma nota privada", remove: "Remover destaque", shared: "Compartilhado na Community." },
};

function textNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let current = walker.nextNode();
  while (current) { nodes.push(current as Text); current = walker.nextNode(); }
  return nodes;
}

function applyHighlight(root: HTMLElement, start: number, end: number, highlight: Highlight, title: string) {
  let cursor = 0;
  const segments = textNodes(root).flatMap((node) => {
    const length = node.textContent?.length ?? 0; const nodeStart = cursor; const nodeEnd = cursor + length; cursor = nodeEnd;
    const segmentStart = Math.max(start, nodeStart); const segmentEnd = Math.min(end, nodeEnd);
    return segmentStart < segmentEnd ? [{ node, start: segmentStart - nodeStart, end: segmentEnd - nodeStart }] : [];
  });
  segments.reverse().forEach((segment, reverseIndex) => {
    const range = document.createRange(); range.setStart(segment.node, segment.start); range.setEnd(segment.node, segment.end);
    const mark = document.createElement("mark"); if (reverseIndex === segments.length - 1) mark.id = `highlight-${highlight.id}`; mark.className = "off-member-highlight"; mark.dataset.highlightId = highlight.id; mark.title = title;
    try { range.surroundContents(mark); } catch { /* The quote selector remains available if a browser rejects this DOM range. */ }
  });
}

export function ArticleAnnotationLayer({ articleId, language, enabled, children }: { articleId: string; language: UiLanguage; enabled: boolean; children: React.ReactNode }) {
  const t = copy[language]; const rootRef = useRef<HTMLDivElement | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]); const [draft, setDraft] = useState<Draft | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 }); const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch(`/api/highlights?articleId=${encodeURIComponent(articleId)}`);
    const data = await response.json().catch(() => null) as { highlights?: Highlight[] } | null;
    if (response.ok) setHighlights(data?.highlights ?? []);
  }, [articleId, enabled]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    Array.from(root.children).forEach((child, index) => (child as HTMLElement).dataset.offBlock = `block-${index}`);
    root.querySelectorAll("mark[data-highlight-id]").forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
    root.normalize();
    highlights.forEach((highlight) => {
      const block = root.querySelector<HTMLElement>(`[data-off-block="${highlight.blockId}"]`); if (!block) return;
      let start = highlight.startOffset ?? -1; let end = highlight.endOffset ?? -1; const text = block.textContent ?? "";
      if (start < 0 || text.slice(start, end) !== highlight.selectedText) { start = text.indexOf(highlight.selectedText); end = start + highlight.selectedText.length; }
      if (start < 0) return;
      applyHighlight(block, start, end, highlight, highlight.note || t.highlight);
    });
  }, [highlights, t.highlight]);

  useEffect(() => {
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setDraft(null); }
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  }, []);

  function captureSelection() {
    if (!enabled) return;
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null; const root = rootRef.current;
    if (!selection || !range || selection.isCollapsed || !root || !root.contains(range.commonAncestorContainer)) return setDraft(null);
    const block = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer as Element : range.commonAncestorContainer.parentElement)?.closest<HTMLElement>("[data-off-block]");
    const selectedText = selection.toString().replace(/\s+/g, " ").trim().slice(0, 500); if (!block || selectedText.length < 2 || !block.contains(range.startContainer) || !block.contains(range.endContainer)) return;
    const before = document.createRange(); before.selectNodeContents(block); before.setEnd(range.startContainer, range.startOffset); const startOffset = before.toString().length; const endOffset = startOffset + selection.toString().length; const text = block.textContent ?? "";
    const rect = range.getBoundingClientRect(); setPosition({ x: Math.min(window.innerWidth - 210, Math.max(12, rect.left + rect.width / 2 - 100)), y: Math.max(70, rect.top - 52) });
    setDraft({ selectedText, blockId: block.dataset.offBlock!, startOffset, endOffset, prefix: text.slice(Math.max(0, startOffset - 60), startOffset), suffix: text.slice(endOffset, endOffset + 60) });
  }

  async function save(withNote = false) {
    if (!draft) return; const note = withNote ? window.prompt(t.addNote, "") ?? "" : "";
    const response = await fetch("/api/highlights", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ articleId, ...draft, note }) });
    if (response.ok) { setDraft(null); window.getSelection()?.removeAllRanges(); await load(); }
  }

  async function openExisting(event: React.MouseEvent) {
    const mark = (event.target as HTMLElement).closest<HTMLElement>("mark[data-highlight-id]"); if (!mark) return;
    const item = highlights.find((highlight) => highlight.id === mark.dataset.highlightId); if (!item) return;
    const action = window.prompt(`${item.selectedText}\n\n${t.note}: ${item.note || "—"}\n\nEscribe una nueva nota, o DELETE para quitar el subrayado.`, item.note ?? "");
    if (action === null) return;
    if (action.trim().toUpperCase() === "DELETE") await fetch("/api/highlights", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    else await fetch("/api/highlights", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, note: action }) });
    await load();
  }

  async function share() {
    if (!draft) return; await save(false); const newest = await fetch(`/api/highlights?articleId=${articleId}`).then((response) => response.json()) as { highlights: Highlight[] }; const match = newest.highlights.find((item) => item.selectedText === draft.selectedText);
    if (match) { await fetch("/api/highlights/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: match.id }) }); setMessage(t.shared); }
  }

  return <div className="off-annotation-layer" onMouseUp={captureSelection} onTouchEnd={captureSelection} onClick={openExisting}>
    <div className="off-annotatable-reader" ref={rootRef}>{children}</div>
    {draft ? <div className="off-selection-toolbar" style={{ left: position.x, top: position.y }} role="toolbar"><button type="button" onClick={() => save(false)}><Highlighter />{t.highlight}</button><button type="button" onClick={() => save(true)}><MessageSquareText />{t.note}</button><button type="button" onClick={share}><Share2 />{t.share}</button><button type="button" onClick={() => setDraft(null)} aria-label="Close"><X /></button></div> : null}
    {message ? <button className="off-annotation-toast" type="button" onClick={() => setMessage("")}>{message}</button> : null}
  </div>;
}
