import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="OFF / Legal" title="Privacidad">
      <h2>Información que recopilamos</h2>
      <p>OFF puede recopilar tu nombre, correo electrónico, contraseña protegida mediante hash, comentarios y actividad básica necesaria para operar la plataforma.</p>
      <h2>Cómo usamos la información</h2>
      <p>Usamos estos datos para darte acceso, gestionar tu suscripción, enviar comunicaciones editoriales autorizadas, proteger tu cuenta y mantener la seguridad del servicio.</p>
      <h2>Tu información no está en venta</h2>
      <p>OFF no vende tus datos personales. Solo compartimos información con proveedores indispensables para operar la plataforma y bajo medidas razonables de seguridad.</p>
      <h2>Contacto</h2>
      <p>Para ejercer tus derechos o consultar esta política, escribe a <a href="mailto:off@maiabusiness.com">off@maiabusiness.com</a>.</p>
    </LegalPage>
  );
}
