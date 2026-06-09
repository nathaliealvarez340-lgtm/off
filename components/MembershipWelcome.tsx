"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function MembershipWelcome({ memberSince, memberNumber }: { memberSince: string; memberNumber: string }) {
  return (
    <main className="membership-welcome">
      <div className="membership-welcome-glow" aria-hidden="true" />
      <motion.section
        className="membership-welcome-content"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src="/logo/logo-off.png" alt="OFF" />
        <p className="membership-kicker">OFF / Membresía privada</p>
        <h1>ESTÁS DENTRO.</h1>
        <div className="membership-welcome-copy">
          <strong>Bienvenido a OFF.</strong>
          <p>Un espacio para quienes están construyendo algo importante sin perderse a sí mismos en el camino.</p>
        </div>
        <dl className="membership-credentials">
          <div>
            <dt>Miembro desde</dt>
            <dd>{memberSince}</dd>
          </div>
          <div>
            <dt>Miembro OFF</dt>
            <dd>#{memberNumber}</dd>
          </div>
        </dl>
        <Link className="membership-enter" href="/lounge">Entrar al Lounge</Link>
      </motion.section>
    </main>
  );
}
