import { LegalPage } from "@/components/LegalPage";
import { SocialTextLinks } from "@/components/SocialLinks";

export default function ContactPage() {
  return (
    <LegalPage eyebrow="OFF / Conversación" title="Contacto">
      <p>Para colaboraciones, soporte o conversaciones editoriales, escribe a <a href="mailto:off@maiabusiness.com">off@maiabusiness.com</a>.</p>
      <div className="legal-social-links">
        <SocialTextLinks />
      </div>
    </LegalPage>
  );
}
