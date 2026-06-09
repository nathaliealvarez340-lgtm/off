"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { MemberGreeting } from "@/components/MemberGreeting";
import { LocalDate } from "@/components/LocalDate";
import { NotaDeNathalie } from "@/components/NotaDeNathalie";

type LoungeArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  readTime: string;
};

type EarlyEdition = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
};

type InternalContent = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
};

const collections = [
  ["Colección I", "Reconstruirte"],
  ["Colección II", "Sueños Ajenos"],
  ["Colección III", "Dirección"],
  ["Colección IV", "Identidad"],
  ["Colección V", "Ambición"],
  ["Colección VI", "Relaciones"],
];

const signals = [
  {
    number: "001",
    text: "Hay una diferencia silenciosa entre avanzar y dirigirte a algún lugar. Avanzar puede sentirse productivo incluso cuando solo estás acumulando movimiento. La dirección, en cambio, obliga a elegir qué merece quedarse fuera. A veces la claridad no llega cuando haces más, sino cuando dejas de negociar con aquello que ya sabes.",
  },
  {
    number: "002",
    text: "No todo cansancio pide descanso. Hay cansancios que piden una conversación honesta, una decisión pendiente o una vida menos diseñada para ser aprobada desde afuera. Antes de intentar recuperar energía, vale la pena preguntarte qué parte de ti lleva demasiado tiempo sosteniendo algo que ya no le pertenece.",
  },
  {
    number: "003",
    text: "La ambición no tiene por qué sentirse como una persecución permanente. También puede ser una forma íntima de cuidado: construir con intención, crecer sin abandonarte y reconocer que llegar más lejos pierde sentido si para hacerlo tienes que desaparecer de tu propia vida.",
  },
];

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function MemberLounge({
  name,
  memberSince,
  memberNumber,
  articles,
  earlyEditions,
  internalContent,
}: {
  name: string;
  memberSince: string;
  memberNumber: string;
  articles: LoungeArticle[];
  earlyEditions: EarlyEdition[];
  internalContent: InternalContent[];
}) {
  const current = articles[0];
  const privateNotes = internalContent.filter((item) => item.category === "Nota privada");
  const curated = internalContent.filter((item) => item.category === "Biblioteca curada");
  const unlocked = internalContent.filter((item) => item.category === "Archivo desbloqueado");
  const earlyAccess = internalContent.filter((item) => item.category === "Early Access");

  return (
    <main className="member-lounge">
      <nav className="lounge-nav">
        <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <div>
          <a href="#archive">The OFF Archive</a>
          <a href="#signals">Signals</a>
          <a href="#exclusives">Exclusivos</a>
          <form action={logoutAction}><button type="submit">Cerrar sesión</button></form>
        </div>
      </nav>

      <motion.header
        className="lounge-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1 }}
      >
        <img src="/images/cap2-off.webp" alt="" />
        <div className="lounge-hero-overlay" />
        <div className="lounge-hero-copy">
          <p className="membership-kicker">The Member Lounge</p>
          <h1><MemberGreeting name={name} /></h1>
          <div className="currently-exploring">
            <span>Actualmente estás explorando</span>
            <strong>{current ? cleanText(current.title) : "El archivo OFF"}</strong>
          </div>
          {current ? <Link href={`/off/${current.slug}`}>Continuar leyendo</Link> : null}
        </div>
      </motion.header>

      <section className="lounge-intro">
        <p>Una sala privada para leer sin prisa, encontrar dirección y volver a ideas que merecen quedarse contigo.</p>
        <dl>
          <div><dt>Miembro desde</dt><dd><LocalDate value={memberSince} /></dd></div>
          <div><dt>Miembro OFF</dt><dd>#{memberNumber}</dd></div>
          <div><dt>Insignia</dt><dd>Founding Member</dd></div>
        </dl>
      </section>

      <section className="lounge-section continue-reading">
        <div className="lounge-heading">
          <span>En tu mesa</span>
          <h2>Continuar leyendo</h2>
        </div>
        {current ? (
          <Link className="continue-editorial" href={`/off/${current.slug}`}>
            <img src={current.coverImage || "/images/cap1-off.webp"} alt="" />
            <div>
              <span>{current.readTime}</span>
              <h3>{cleanText(current.title)}</h3>
              <p>{cleanText(current.excerpt)}</p>
              <strong>Volver a la lectura</strong>
            </div>
          </Link>
        ) : <p className="lounge-empty">El archivo se abrirá con la próxima edición.</p>}
      </section>

      <section className="lounge-section archive-section" id="archive">
        <div className="lounge-heading">
          <span>Biblioteca curada</span>
          <h2>The OFF Archive</h2>
        </div>
        <div className="archive-volumes">
          {collections.map(([volume, title], index) => {
            const curatedItem = curated[index];
            const article = articles[index % Math.max(articles.length, 1)];
            return (
              <article className="archive-volume" key={volume}>
                <span>{volume}</span>
                <h3>{title}</h3>
                <p>{curatedItem?.title ?? (article ? cleanText(article.title) : "Volumen en preparación")}</p>
                {article ? <Link href={`/off/${article.slug}`}>Abrir volumen</Link> : <em>Próximamente</em>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="lounge-section signals-section" id="signals">
        <div className="lounge-heading">
          <span>Notas privadas</span>
          <h2>Signals</h2>
        </div>
        <div className="signals-list">
          {(privateNotes.length ? privateNotes.map((note, index) => ({ number: String(index + 1).padStart(3, "0"), text: note.excerpt })) : signals).map((signal) => (
            <article className="signal-note" key={signal.number}>
              <span>Signal #{signal.number}</span>
              <p>{signal.text}</p>
            </article>
          ))}
        </div>
      </section>

      <NotaDeNathalie>
        OFF no fue creado para darte más ruido. Fue creado para acompañarte a nombrar lo que sientes, elegir con más claridad y construir sin perderte en el proceso.
      </NotaDeNathalie>

      <section className="lounge-section exclusives-section" id="exclusives">
        <div className="lounge-heading">
          <span>Archivo privado</span>
          <h2>Recursos desbloqueados</h2>
        </div>
        <div className="exclusive-ledger">
          {(unlocked.length ? unlocked : [
            { id: "01", title: "Journaling prompts", excerpt: "Preguntas para escuchar lo que la velocidad suele esconder." },
            { id: "02", title: "Framework de dirección", excerpt: "Una estructura breve para distinguir movimiento de progreso." },
            { id: "03", title: "Habit tracker consciente", excerpt: "Seguimiento sin convertir tu vida en otra lista de rendimiento." },
          ]).map((item, index) => <div key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.excerpt}</p></div>)}
        </div>
      </section>

      <section className="lounge-section early-access">
        <div className="lounge-heading">
          <span>Early access</span>
          <h2>Próximamente en OFF</h2>
        </div>
        <div className="early-editions">
          {(earlyAccess.length ? earlyAccess.map((item) => ({ ...item, date: new Date().toISOString() })) : earlyEditions).length ? (earlyAccess.length ? earlyAccess.map((item) => ({ ...item, date: new Date().toISOString() })) : earlyEditions).map((edition) => (
            <article key={edition.id}>
              <time><LocalDate value={edition.date} /></time>
              <h3>{cleanText(edition.title)}</h3>
              <p>{cleanText(edition.excerpt)}</p>
            </article>
          )) : <p className="lounge-empty">La próxima edición todavía está tomando forma.</p>}
        </div>
      </section>

      <section className="member-profile-editorial">
        <div>
          <span>Perfil del miembro</span>
          <h2><MemberGreeting name={name} /></h2>
          <p>Actualmente estás explorando: <strong>{current ? "Reconstruirte" : "The OFF Archive"}</strong></p>
        </div>
        <dl>
          <div><dt>Tiempo invertido en OFF</dt><dd>Aún sin registro</dd></div>
          <div><dt>Artículos completados</dt><dd>Aún sin registro</dd></div>
          <div><dt>Insignias</dt><dd>Founding Member · Early Reader</dd></div>
        </dl>
      </section>

      <footer className="lounge-footer">
        <img src="/logo/logo-off.png" alt="OFF" />
        <p>No te suscribiste a un newsletter.<br />Entraste a un lugar al que quieres volver.</p>
      </footer>
    </main>
  );
}
