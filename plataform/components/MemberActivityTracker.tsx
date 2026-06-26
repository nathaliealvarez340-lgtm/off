"use client";

import { useEffect } from "react";

const INTERVAL_SECONDS = 30;
const IDLE_AFTER_MS = 2 * 60 * 1000;

export function MemberActivityTracker() {
  useEffect(() => {
    let lastInteraction = Date.now();
    const markActive = () => { lastInteraction = Date.now(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "mousemove", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const timer = window.setInterval(() => {
      const active = document.visibilityState === "visible" && Date.now() - lastInteraction < IDLE_AFTER_MS;
      if (!active) return;
      void fetch("/api/member/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: INTERVAL_SECONDS }),
        keepalive: true,
      });
    }, INTERVAL_SECONDS * 1000);

    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, []);

  return null;
}
