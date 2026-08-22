"use client";

import { Hand, UserPlus } from "lucide-react";
import { useState } from "react";
import { communityCopy } from "@/lib/community-i18n";
import type { CommunityMemberData } from "@/lib/community";
import type { UiLanguage } from "@/lib/ui-i18n";

export function CommunityProfileActions({ member, language }: { member: CommunityMemberData; language: UiLanguage }) {
  const copy = communityCopy[language];
  const [status, setStatus] = useState(member.connectionStatus);
  const [direction, setDirection] = useState(member.connectionDirection);
  const [message, setMessage] = useState("");

  async function connect(action: "request" | "accept") {
    const response = await fetch("/api/community/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: member.id, action }) });
    const data = await response.json().catch(() => null) as { status?: CommunityMemberData["connectionStatus"] } | null;
    if (response.ok && data?.status) { setStatus(data.status); setDirection(action === "request" ? "OUTGOING" : null); }
    else setMessage(copy.actionError);
  }

  async function greet() {
    const response = await fetch("/api/community/greetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: member.id }) });
    setMessage(response.ok ? `${copy.greet}: ${member.name}` : copy.actionError);
  }

  return <div className="off-community-profile-actions"><button type="button" onClick={greet}><Hand />{copy.greet}</button>{status === "NONE" || status === "DECLINED" ? <button type="button" onClick={() => connect("request")}><UserPlus />{copy.connect}</button> : status === "PENDING" && direction === "INCOMING" ? <button type="button" onClick={() => connect("accept")}>{copy.accept}</button> : <span>{status === "CONNECTED" ? copy.connected : copy.sent}</span>}{message ? <small>{message}</small> : null}</div>;
}
