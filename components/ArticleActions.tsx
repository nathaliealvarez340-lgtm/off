"use client";

import { Bookmark, Ellipsis, Pause, Play, Share2, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { articleLanguages, articleUi, type ArticleLanguage } from "@/lib/article-i18n";

type Props = {
  isLoggedIn: boolean;
  language: ArticleLanguage;
  loginPath: string;
  slug: string;
  speechText: string;
  title: string;
  userKey?: string;
};

export function ArticleActions({ isLoggedIn, language, loginPath, slug, speechText, title, userKey }: Props) {
  const router = useRouter();
  const t = articleUi[language];
  const [saved, setSaved] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceType, setVoiceType] = useState<"woman" | "man">("woman");
  const [url, setUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  const storageKey = useMemo(() => `off-saved-article:${userKey ?? "guest"}:${slug}`, [slug, userKey]);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNativeShare(Boolean(navigator.share));
    setSaved(window.localStorage.getItem(storageKey) === "1");
    const preferredLanguage = window.localStorage.getItem("off-language");
    if (preferredLanguage && ["es", "en", "it", "pt"].includes(preferredLanguage) && preferredLanguage !== language) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("lang", preferredLanguage);
      router.replace(`${nextUrl.pathname}${nextUrl.search}`);
    }
    return () => window.speechSynthesis?.cancel();
  }, [language, router, storageKey]);

  function changeLanguage(nextLanguage: ArticleLanguage) {
    window.localStorage.setItem("off-language", nextLanguage);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("lang", nextLanguage);
    router.push(`${nextUrl.pathname}${nextUrl.search}`);
  }

  function toggleSaved() {
    if (!isLoggedIn) {
      router.push(loginPath);
      return;
    }
    const next = !saved;
    setSaved(next);
    if (next) window.localStorage.setItem(storageKey, "1");
    else window.localStorage.removeItem(storageKey);
  }

  function chooseVoice() {
    const voices = window.speechSynthesis.getVoices();
    const languagePrefix = language === "pt" ? "pt" : language;
    const matchingLanguage = voices.filter((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
    const femalePattern = /female|woman|mujer|paulina|monica|helena|luciana|samantha|victoria|zira/i;
    const malePattern = /male|man|hombre|jorge|diego|daniel|alex|david/i;
    return matchingLanguage.find((voice) => (voiceType === "woman" ? femalePattern : malePattern).test(voice.name))
      ?? matchingLanguage[voiceType === "woman" ? 0 : 1]
      ?? matchingLanguage[0]
      ?? voices[0];
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = rate;
    utterance.voice = chooseVoice() ?? null;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function shareNative() {
    if (navigator.share) await navigator.share({ title, url });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setShareOpen(false);
  }

  return (
    <div className="article-action-deck">
      <div className="article-language-switcher" aria-label="Article language">
        {articleLanguages.map((item) => (
          <button className={item.code === language ? "active" : ""} key={item.code} onClick={() => changeLanguage(item.code)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      <div className="article-action-buttons">
        <button className={saved ? "active" : ""} onClick={toggleSaved} type="button">
          <Bookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          <span>{saved ? t.saved : t.save}</span>
        </button>

        <div className="article-action-popover">
          <button aria-expanded={readerOpen} onClick={() => { setReaderOpen((open) => !open); setShareOpen(false); }} type="button">
            <Volume2 aria-hidden="true" />
            <span>{t.reader}</span>
            <Ellipsis aria-hidden="true" />
          </button>
          {readerOpen ? (
            <div className="article-popover-panel reader-controls">
              <button className="reader-play-button" onClick={toggleSpeech} type="button">
                {speaking ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                {speaking ? t.stop : t.play}
              </button>
              <label>{t.speed}
                <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
                  {[0.75, 1, 1.25, 1.5, 2].map((speed) => <option value={speed} key={speed}>{speed.toFixed(speed === 1 ? 1 : 2).replace(/0$/, "")}x</option>)}
                </select>
              </label>
              <label>{t.voice}
                <select value={voiceType} onChange={(event) => setVoiceType(event.target.value as "woman" | "man")}>
                  <option value="woman">{t.woman}</option>
                  <option value="man">{t.man}</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div className="article-action-popover">
          <button aria-expanded={shareOpen} onClick={() => { setShareOpen((open) => !open); setReaderOpen(false); }} type="button">
            <Share2 aria-hidden="true" />
            <span>{t.share}</span>
          </button>
          {shareOpen ? (
            <div className="article-popover-panel share-options">
              {canNativeShare ? <button onClick={() => void shareNative()} type="button">{t.nativeShare}</button> : null}
              <button onClick={() => void copyLink()} type="button">{t.copy}</button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">X</a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
