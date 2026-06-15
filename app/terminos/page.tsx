import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="OFF / Legal" title="Términos">
      <h2>Uso de la plataforma</h2>
      <p>Al usar OFF aceptas hacerlo de manera responsable, respetando la experiencia editorial, a otros miembros y las reglas de acceso de la plataforma.</p>
      <h2>Membresía y contenido</h2>
      <p>La membresía permite acceder a contenido editorial y espacios privados. El contenido de OFF está protegido por propiedad intelectual y no puede reproducirse o distribuirse sin autorización.</p>
      <h2>Comentarios y conducta</h2>
      <p>Las conversaciones deben mantenerse respetuosas. OFF puede moderar o retirar comentarios que dañen a otras personas o afecten la seguridad de la comunidad.</p>
      <h2>Responsabilidad y cambios</h2>
      <p>El contenido es editorial e informativo y no sustituye asesoría profesional. OFF puede actualizar, modificar o discontinuar partes del servicio cuando sea necesario.</p>
    </LegalPage>
  );
}
