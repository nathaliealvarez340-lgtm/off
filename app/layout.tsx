import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  title: "OFF | Revista digital editorial",
  description:
    "OFF es una editorial digital para una generación que está construyendo su vida mientras intenta entender por qué se siente desconectada.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    title: "OFF | Revista digital editorial",
    description:
      "Capítulos sobre vida, carrera, negocios, mentalidad y crecimiento para una generación emocionalmente saturada.",
    images: ["/covers/off-chapter-1.svg"],
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
