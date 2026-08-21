import { OFF_SOCIAL_LINKS, hasEmbeddedOffEditorialFooter } from "@/lib/off-social-links";
import { uiCopy, type UiLanguage } from "@/lib/ui-i18n";

export function OffEditorialFooter({
  language = "es",
  sourceContent,
  protectedPreview = false,
}: {
  language?: UiLanguage;
  sourceContent?: string | null;
  protectedPreview?: boolean;
}) {
  if (hasEmbeddedOffEditorialFooter(sourceContent)) return null;
  const copy = uiCopy[language];

  return (
    <footer className={`off-editorial-footer${protectedPreview ? " is-protected-preview" : ""}`} aria-label={copy.editorialFooterLabel}>
      {protectedPreview ? <span className="off-editorial-footer-lock">{copy.editorialFooterAutomatic}</span> : null}
      <p>
        {copy.editorialFooterLead}{" "}
        <a href={OFF_SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer">INSTAGRAM</a>,{" "}
        <a href={OFF_SOCIAL_LINKS.substack} target="_blank" rel="noopener noreferrer">SUBSTACK</a>{" "}
        {copy.editorialFooterAnd}{" "}
        <a href={OFF_SOCIAL_LINKS.linkedinNewsletter} target="_blank" rel="noopener noreferrer">LINKEDIN</a>.
      </p>
      <small>{copy.editorialFooterCopyright}</small>
    </footer>
  );
}
