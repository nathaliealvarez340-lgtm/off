import { LegalPage } from "@/components/LegalPage";

export default function ContactPage() {
  return (
    <LegalPage eyebrow="OFF / Conversación" title="Contacto">
      <p>Para colaboraciones, soporte o conversaciones editoriales, escribe a <a href="mailto:nathaliegarcia@business.com">nathaliegarcia@business.com</a>.</p>
      <div className="legal-social-links">
        <a href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer">Instagram</a>
        <a href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="https://substack.com/@nathalieegarcia?r=7mwiko&utm_campaign=profile&utm_medium=profile-page" target="_blank" rel="noreferrer">Substack</a>
      </div>
    </LegalPage>
  );
}
