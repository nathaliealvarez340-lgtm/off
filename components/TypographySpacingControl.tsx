"use client";

import type { Editor } from "@tiptap/core";
import { ArrowLeftRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LETTER_MIN = -0.1;
const LETTER_MAX = 0.2;
const LETTER_STEP = 0.005;
const LINE_MIN = 0.8;
const LINE_MAX = 3;
const LINE_STEP = 0.05;
const DEFAULT_LABELS = { letterSpacing: "Interletrado", lineHeight: "Interlineado", control: "Espaciado tipográfico" };

function numericAttribute(value: unknown, fallback: number) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

export function TypographySpacingControl({
  editor,
  onChange,
  compact = false,
  labels = DEFAULT_LABELS,
}: {
  editor: Editor | null;
  onChange?: (html: string) => void;
  compact?: boolean;
  labels?: { letterSpacing: string; lineHeight: string; control: string };
}) {
  const [open, setOpen] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.2);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    function syncFromSelection() {
      const attributes = editor?.getAttributes("textStyle") ?? {};
      setLetterSpacing(formatNumber(numericAttribute(attributes.letterSpacing, 0), 3));
      setLineHeight(formatNumber(numericAttribute(attributes.lineHeight, 1.2), 2));
    }

    syncFromSelection();
    editor.on("selectionUpdate", syncFromSelection);
    editor.on("transaction", syncFromSelection);
    editor.on("focus", syncFromSelection);
    return () => {
      editor.off("selectionUpdate", syncFromSelection);
      editor.off("transaction", syncFromSelection);
      editor.off("focus", syncFromSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!open) return;

    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function apply(attributes: { letterSpacing?: string; lineHeight?: string }) {
    if (!editor) return;
    const { from, to, empty, $from } = editor.state.selection;
    const range = empty ? { from: $from.start(), to: $from.end() } : { from, to };
    const merged = { ...editor.getAttributes("textStyle"), ...attributes };
    const chain = editor.chain().focus().setTextSelection(range).setMark("textStyle", merged).setTextSelection({ from, to });
    if (empty) chain.setMark("textStyle", merged);
    chain.run();
    onChange?.(editor.getHTML());
  }

  function updateLetterSpacing(value: number) {
    if (!Number.isFinite(value)) return;
    const next = formatNumber(Math.min(LETTER_MAX, Math.max(LETTER_MIN, value)), 3);
    setLetterSpacing(next);
    apply({ letterSpacing: `${next}em` });
  }

  function updateLineHeight(value: number) {
    if (!Number.isFinite(value)) return;
    const next = formatNumber(Math.min(LINE_MAX, Math.max(LINE_MIN, value)), 2);
    setLineHeight(next);
    apply({ lineHeight: String(next) });
  }

  return (
    <div className={`typography-spacing-control${compact ? " is-compact" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={letterSpacing !== 0 || lineHeight !== 1.2 ? "active" : ""}
        title={labels.control}
        aria-label={labels.control}
        aria-expanded={open}
        disabled={!editor}
        onClick={() => setOpen((current) => !current)}
      >
        <ArrowLeftRight aria-hidden="true" />
      </button>
      {open ? (
        <div className="typography-spacing-popover" role="dialog" aria-label={labels.control}>
          <label>
            <span>{labels.letterSpacing}</span>
            <div>
              <input
                type="range"
                min={LETTER_MIN}
                max={LETTER_MAX}
                step={LETTER_STEP}
                value={letterSpacing}
                onChange={(event) => updateLetterSpacing(event.currentTarget.valueAsNumber)}
              />
              <input
                className="typography-spacing-value"
                type="number"
                min={LETTER_MIN}
                max={LETTER_MAX}
                step={LETTER_STEP}
                value={letterSpacing}
                onChange={(event) => updateLetterSpacing(event.currentTarget.valueAsNumber)}
                aria-label={`${labels.letterSpacing} actual`}
              />
            </div>
          </label>
          <label>
            <span>{labels.lineHeight}</span>
            <div>
              <input
                type="range"
                min={LINE_MIN}
                max={LINE_MAX}
                step={LINE_STEP}
                value={lineHeight}
                onChange={(event) => updateLineHeight(event.currentTarget.valueAsNumber)}
              />
              <input
                className="typography-spacing-value"
                type="number"
                min={LINE_MIN}
                max={LINE_MAX}
                step={LINE_STEP}
                value={lineHeight}
                onChange={(event) => updateLineHeight(event.currentTarget.valueAsNumber)}
                aria-label={`${labels.lineHeight} actual`}
              />
            </div>
          </label>
        </div>
      ) : null}
    </div>
  );
}
