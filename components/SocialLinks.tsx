import type { ReactNode } from "react";

type SocialProfile = {
  key: "instagram" | "linkedin" | "x";
  label: string;
  platform: string;
  display: string;
  href: string;
};

export const socialProfiles: SocialProfile[] = [
  {
    key: "instagram",
    label: "Instagram OFF",
    platform: "INSTAGRAM",
    display: "@off_journal",
    href: "https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    platform: "LINKEDIN",
    display: "Nathalie Garcia A.",
    href: "https://www.linkedin.com/in/nathaliegarciaa/",
  },
  {
    key: "x",
    label: "X OFF",
    platform: "X",
    display: "@off_journal",
    href: "https://x.com/off_journal",
  },
];

export function SocialIcon({ type }: { type: SocialProfile["key"] }) {
  if (type === "instagram") {
    return (
      <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.2" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.2" cy="6.8" r="1" />
      </svg>
    );
  }

  if (type === "linkedin") {
    return (
      <svg className="social-icon filled" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 8.7h3.1v10.1H5.2V8.7Zm1.6-4.9a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm3.7 4.9h3v1.4h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v5.4h-3.1V14c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6v4.9h-3.1V8.7Z" />
      </svg>
    );
  }

  return (
    <svg className="social-icon filled" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 10.4 21 3h-2.1l-5.6 6.1L8.8 3H3l7.2 9.7L3 21h2.1l6-6.8 4.9 6.8h5.8l-7.6-10.6Zm-2.1 2.4-.9-1.2-5-6.9h1.7l4 5.5.9 1.2 5.3 7.3h-1.7l-4.3-5.9Z" />
    </svg>
  );
}

function ExternalLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>;
}

function SocialProfileContent({ profile }: { profile: SocialProfile }) {
  return (
    <>
      <span className="social-card-icon"><SocialIcon type={profile.key} /></span>
      <span className="social-card-copy">
        <strong>{profile.platform}</strong>
        <small>{profile.display}</small>
      </span>
    </>
  );
}

export function SocialCard({ profile }: { profile: SocialProfile }) {
  return (
    <ExternalLink className="profile-social-card" href={profile.href}>
      <SocialProfileContent profile={profile} />
    </ExternalLink>
  );
}

export function SocialTile({ profile }: { profile: SocialProfile }) {
  return (
    <ExternalLink className="lounge-social-card" href={profile.href}>
      <SocialProfileContent profile={profile} />
    </ExternalLink>
  );
}

export function SocialPill({ profile }: { profile: SocialProfile }) {
  return (
    <ExternalLink className="mobile-social-pill" href={profile.href}>
      <SocialProfileContent profile={profile} />
    </ExternalLink>
  );
}

export function SocialTextLinks({ includeSubstack = true }: { includeSubstack?: boolean }) {
  const links = [
    ...socialProfiles,
    ...(includeSubstack
      ? [{
          key: "x" as const,
          label: "Substack",
          platform: "SUBSTACK",
          display: "Substack",
          href: "https://substack.com/@nathalieegarcia?r=7mwiko&utm_campaign=profile&utm_medium=profile-page",
        }]
      : []),
  ];

  return (
    <>
      {links.map((profile) => (
        <a href={profile.href} target="_blank" rel="noreferrer" key={profile.label}>{profile.label}</a>
      ))}
    </>
  );
}
