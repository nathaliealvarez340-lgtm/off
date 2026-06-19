"use client";

import { useMemo, useState } from "react";

const domains = [
  { label: "@gmail.com", value: "gmail.com" },
  { label: "@hotmail.com", value: "hotmail.com" },
  { label: "@outlook.com", value: "outlook.com" },
  { label: "@icloud.com", value: "icloud.com" },
  { label: "@yahoo.com", value: "yahoo.com" },
  { label: "otro", value: "custom" },
];

export function EmailSplitField({
  label,
  placeholder = "tu correo",
}: {
  label: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState("");
  const [domain, setDomain] = useState("gmail.com");
  const [customDomain, setCustomDomain] = useState("");

  const email = useMemo(() => {
    const cleanLocal = local.trim().replace(/\s+/g, "");
    const cleanDomain = (domain === "custom" ? customDomain : domain).trim().replace(/^@+/, "").replace(/\s+/g, "");
    if (!cleanLocal || !cleanDomain) return "";
    return `${cleanLocal}@${cleanDomain}`.toLowerCase();
  }, [customDomain, domain, local]);

  function updateLocal(value: string) {
    const clean = value.trim();
    if (clean.includes("@")) {
      const [nextLocal, ...domainParts] = clean.split("@");
      const nextDomain = domainParts.join("@").replace(/^@+/, "");
      setLocal(nextLocal);
      if (domains.some((item) => item.value === nextDomain)) {
        setDomain(nextDomain);
        setCustomDomain("");
      } else {
        setDomain("custom");
        setCustomDomain(nextDomain);
      }
      return;
    }
    setLocal(value);
  }

  return (
    <label className="field email-split-field">
      {label}
      <input name="email" type="hidden" value={email} />
      <div className="email-split-control">
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => updateLocal(event.target.value)}
          placeholder={placeholder}
          required
          type="text"
          value={local}
        />
        <select aria-label="Dominio de correo" onChange={(event) => setDomain(event.target.value)} value={domain}>
          {domains.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      {domain === "custom" ? (
        <input
          className="email-custom-domain"
          onChange={(event) => setCustomDomain(event.target.value)}
          placeholder="empresa.com"
          required
          type="text"
          value={customDomain}
        />
      ) : null}
    </label>
  );
}
