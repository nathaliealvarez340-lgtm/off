"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { LocalDate } from "@/components/LocalDate";
import type { UiLanguage } from "@/lib/ui-i18n";
import { mobileCopy } from "@/mobile/mobileCopy";

type CurrentReading = {
  title: string;
  excerpt: string;
  coverImage: string;
  readTime: string;
  href: string;
  progress: number;
};

export function MemberProfileExperience({
  memberSince,
  memberNumber,
  activeTime,
  completedCount,
  badges,
  currentReading,
  language,
}: {
  memberSince: string;
  memberNumber: string;
  activeTime: string;
  completedCount: number;
  badges: string[];
  currentReading?: CurrentReading | null;
  language: UiLanguage;
}) {
  const copy = mobileCopy[language];
  const reducedMotion = useReducedMotion();
  const badge = badges.at(-1);
  const metrics = [
    { label: copy.timeInvested, value: activeTime },
    { label: copy.articlesCompleted, value: completedCount > 0 ? String(completedCount) : copy.noReadingsYet },
    { label: copy.badges, value: badges.length > 0 ? String(badges.length) : copy.noBadgesYet },
    { label: copy.memberSince, value: <LocalDate value={memberSince} /> },
  ];

  return (
    <motion.section
      className="lounge-member-profile"
      id="member-profile"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.58, ease: [0.23, 1, 0.32, 1] }}
    >
      <header className="member-profile-heading">
        <span>{copy.profileKicker}</span>
        <h2>{copy.profileTitle}</h2>
      </header>

      <div className="member-progress-timeline" aria-label={copy.progressTimeline}>
        <svg viewBox="0 0 1000 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d="M125 56 C210 12 290 86 375 44 S540 8 625 28 S790 84 875 50" />
          <circle cx="125" cy="56" r="7" />
          <circle cx="375" cy="44" r="7" />
          <circle cx="625" cy="28" r="7" />
          <circle cx="875" cy="50" r="7" />
        </svg>
        <div className="member-progress-metrics">
          {metrics.map((metric, index) => (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.36 }}
              key={metric.label}
            >
              <i aria-hidden="true" />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="member-profile-grid">
        <div className="member-profile-story">
          <p>{copy.loungeCopy}</p>
          <dl>
            <div><dt>{copy.memberSince}</dt><dd><LocalDate value={memberSince} /></dd></div>
            <div><dt>{copy.offId}</dt><dd>#{memberNumber}</dd></div>
            <div><dt>{copy.membershipBadge}</dt><dd>{badge ?? copy.noBadgesYet}</dd></div>
          </dl>
        </div>

        <div className={badge ? "off-member-badge has-badge" : "off-member-badge is-empty"}>
          <span>{copy.membershipBadge}</span>
          <img src="/logo/logo-off.png" alt="OFF" />
          <strong>{badge ?? copy.noBadgesYet}</strong>
          <small>OFF MEMBER · #{memberNumber}</small>
        </div>

        <div className="member-current-reading">
          <span>{copy.currentReading}</span>
          {currentReading ? (
            <Link href={currentReading.href}>
              <img src={currentReading.coverImage || "/images/cap1-off.webp"} alt="" />
              <div>
                <small>{currentReading.readTime}{currentReading.progress > 0 ? ` · ${currentReading.progress}%` : ""}</small>
                <h3>{currentReading.title}</h3>
                <p>{currentReading.excerpt}</p>
                {currentReading.progress > 0 ? <span className="member-reading-progress"><i style={{ width: `${currentReading.progress}%` }} /></span> : null}
                <strong>{copy.continueReading}</strong>
              </div>
            </Link>
          ) : <p className="member-reading-empty">{copy.noCurrentReading}</p>}
        </div>
      </div>
    </motion.section>
  );
}
