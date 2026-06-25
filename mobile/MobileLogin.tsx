"use client";

import Link from "next/link";
import { AuthForms } from "@/components/AuthForms";
import { AuthOrbit } from "@/components/AuthOrbit";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useMobileCopy } from "@/mobile/mobileCopy";

export function MobileLogin({ next, initialMessage = "" }: { next: string; initialMessage?: string }) {
  const { copy } = useMobileCopy();

  return (
    <main className="off-mobile mobile-auth">
      <img className="mobile-auth-bg" src="/images/hero-off.webp" alt="" />
      <nav className="mobile-topbar">
        <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <div>
          <LanguageSwitcher compact />
          <Link href="/">OFF</Link>
        </div>
      </nav>
      <AuthOrbit />
      <section className="mobile-auth-card">
        <p className="mobile-kicker">OFF / Access</p>
        <h1>{copy.enterOff}</h1>
        <p>{copy.heroSubtitle}</p>
        <AuthForms next={next} initialMessage={initialMessage} />
      </section>
      <footer className="mobile-auth-footer">© 2026 OFF</footer>
    </main>
  );
}
