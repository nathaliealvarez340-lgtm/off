import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section">
      <p className="eyebrow">404 / OFF</p>
      <h1 className="section-title">Este capítulo no existe o aún está en borrador.</h1>
      <Link className="button" href="/">
        Volver a la revista
      </Link>
    </main>
  );
}
