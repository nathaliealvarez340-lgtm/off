"use client";

import { useEffect } from "react";

export function AdminSessionGuard() {
  useEffect(() => {
    const key = "off-admin-session-active";
    const hasTabSession = window.sessionStorage.getItem(key) === "true";
    const cameFromLogin = document.referrer ? new URL(document.referrer).pathname === "/login" : false;

    if (!hasTabSession && !cameFromLogin) {
      fetch("/api/logout", { method: "POST", keepalive: true })
        .finally(() => {
          window.location.replace("/login");
        });
      return;
    }

    window.sessionStorage.setItem(key, "true");
  }, []);

  return null;
}
