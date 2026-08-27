"use client";

import { BookOpen, Brain, Globe2, LogOut, Map as MapIcon, MessageCircle, Search, Sparkles, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions";
import { useOffLanguage } from "@/components/useOffLanguage";
import { LANGUAGE_OPTIONS, type UiLanguage } from "@/lib/ui-i18n";
import { mobileCopy } from "@/mobile/mobileCopy";

type LoungeNavigationTargets = {
  library: string;
  self: string;
  profile: string;
  more: string;
};

const defaultTargets: LoungeNavigationTargets = {
  library: "#biblioteca",
  self: "#mi-yo",
  profile: "#member-profile",
  more: "#conoce-mas",
};

export function LoungeBottomNavigation({
  activeSection,
  initialLanguage = "es",
  targets = defaultTargets,
}: {
  activeSection?: string;
  initialLanguage?: UiLanguage;
  targets?: LoungeNavigationTargets;
}) {
  const { language, setLanguage } = useOffLanguage(initialLanguage);
  const copy = mobileCopy[language];
  const [languageOpen, setLanguageOpen] = useState(false);
  const [observedSection, setObservedSection] = useState("");
  const languageDialogRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const items = [
    { href: targets.library, label: copy.library, icon: BookOpen },
    { href: targets.self, label: copy.mySelfKicker, icon: Brain },
    { href: targets.profile, label: copy.profileKicker, icon: UserRound },
  ];
  const resolvedActiveSection = activeSection ?? observedSection;

  useEffect(() => {
    if (activeSection) return;
    const sections = Object.values(targets)
      .map((href) => document.getElementById(href.slice(1)))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setObservedSection(visible.target.id);
    }, { rootMargin: "-28% 0px -58% 0px", threshold: [0.05, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [activeSection, targets.library, targets.more, targets.profile, targets.self]);

  useEffect(() => {
    if (!languageOpen) return;
    const firstButton = languageDialogRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLanguageOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [languageOpen]);

  return (
    <>
      <nav className="lounge-bottom-navigation" aria-label={copy.mobileLoungeNavigation}>
        {items.map(({ href, label, icon: Icon }) => {
          const current = resolvedActiveSection === href.slice(1);
          return (
            <a className={current ? "is-active" : ""} href={href} aria-current={current ? "location" : undefined} key={href}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </a>
          );
        })}
        <Link className={resolvedActiveSection === "chat" ? "is-active" : ""} href="/mobile/chat">
          <MessageCircle aria-hidden="true" /><span>{copy.chatKicker}</span>
        </Link>
        <Link className={resolvedActiveSection === "community" ? "is-active" : ""} href="/lounge/community">
          <UsersRound aria-hidden="true" /><span>{copy.community}</span>
        </Link>
        <Link className={resolvedActiveSection === "map" ? "is-active" : ""} href="/lounge/map">
          <MapIcon aria-hidden="true" /><span>{copy.myMap}</span>
        </Link>
        <button
          ref={searchButtonRef}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("off-open-search", { detail: { opener: searchButtonRef.current } }))}
        >
          <Search aria-hidden="true" /><span>{copy.search}</span>
        </button>
        <button type="button" onClick={() => setLanguageOpen(true)} aria-haspopup="dialog" aria-expanded={languageOpen}>
          <Globe2 aria-hidden="true" /><span>{copy.language}</span>
        </button>
        <a className={resolvedActiveSection === targets.more.slice(1) ? "is-active" : ""} href={targets.more}>
          <Sparkles aria-hidden="true" /><span>{copy.more}</span>
        </a>
        <form action={logoutAction}>
          <button type="submit"><LogOut aria-hidden="true" /><span>{copy.exit}</span></button>
        </form>
      </nav>

      {languageOpen ? (
        <div className="lounge-language-backdrop" role="presentation" onMouseDown={() => setLanguageOpen(false)}>
          <div
            className="lounge-language-dialog"
            ref={languageDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.language}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span>{copy.language}</span>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                className={language === option.code ? "is-active" : ""}
                type="button"
                onClick={() => { setLanguage(option.code); setLanguageOpen(false); }}
                key={option.code}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
