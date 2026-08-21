export const OFF_SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA==",
  substack: "https://substack.com/@nathalieegarcia?r=7mwiko&utm_campaign=profile&utm_medium=profile-page",
  linkedinProfile: "https://www.linkedin.com/in/nathaliegarciaa/",
  linkedinNewsletter: "https://www.linkedin.com/newsletters/se-ve-bien%25E2%2580%25A6-pero-se-siente-off-7456836493077082113/",
  x: "https://x.com/off_journal",
} as const;

const EMBEDDED_FOOTER_MARKERS = [
  "si este capítulo conectó contigo",
  "si este capitulo conecto contigo",
  "if this chapter connected with you",
  "se questo capitolo ti ha parlato",
  "se este capítulo se conectou com você",
  "nathalie garcia for off",
];

export function hasEmbeddedOffEditorialFooter(content?: string | null) {
  if (!content) return false;
  const normalized = content.toLocaleLowerCase();
  const linkedProfiles = [
    OFF_SOCIAL_LINKS.instagram,
    OFF_SOCIAL_LINKS.substack,
    OFF_SOCIAL_LINKS.linkedinNewsletter,
  ].filter((url) => normalized.includes(url.toLocaleLowerCase())).length;

  return linkedProfiles >= 2 || EMBEDDED_FOOTER_MARKERS.some((marker) => normalized.includes(marker));
}
