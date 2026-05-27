import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "USER") redirect(safeNext);

  return (
    <main className="auth-page">
      <Link href="/" className="brand logo-brand">
        <img src="/logo/logo-off.png" alt="OFF Logo" width={104} height={42} />
      </Link>
      <section>
        <p className="eyebrow">OFF / Acceso</p>
        <h1>Entrar a OFF</h1>
        <p>Una cuenta para leer, guardar dirección y participar en la conversación.</p>
        <AuthForms next={safeNext} />
      </section>
    </main>
  );
}
