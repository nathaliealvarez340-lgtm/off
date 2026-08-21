"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { markNotificationReadAction } from "@/app/actions";

export type MemberNotificationData = {
  id: string;
  title: string;
  message: string;
  href?: string | null;
};

export function MemberNotification({ notification }: { notification?: MemberNotificationData | null }) {
  const [visible, setVisible] = useState(Boolean(notification));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!notification || !visible) return null;
  const activeNotification = notification;

  function dismiss() {
    if (isPending) return;
    const notificationId = activeNotification.id;
    setError("");
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      if (result.ok) setVisible(false);
      else setError(result.message);
    });
  }

  return (
    <aside className="member-notification" role="status" aria-labelledby="member-notification-title">
      <button type="button" onClick={dismiss} disabled={isPending} aria-label="Cerrar saludo">
        <X aria-hidden="true" />
      </button>
      <p>Desde la mesa editorial</p>
      <h2 id="member-notification-title">{activeNotification.title}</h2>
      <div>{activeNotification.message}</div>
      {activeNotification.href ? <Link href={activeNotification.href}>Ver publicación</Link> : null}
      <strong>— Nathalie / OFF</strong>
      {error ? <small>{error}</small> : null}
    </aside>
  );
}
