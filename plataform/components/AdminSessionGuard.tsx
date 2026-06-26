"use client";

import { useEffect } from "react";

export function AdminSessionGuard() {
  useEffect(() => {
    const key = "off-admin-session-active";
    let cancelled = false;

    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session: { ok?: boolean }) => {
        if (cancelled) return;
        if (session.ok) {
          window.sessionStorage.setItem(key, "true");
          return;
        }
        window.sessionStorage.removeItem(key);
        window.location.replace("/login");
      })
      .catch(() => {
        if (!cancelled) {
          window.sessionStorage.removeItem(key);
          window.location.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
