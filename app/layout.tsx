import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const SITE_TITLE = "Se ve bien pero se siente OFF";
const SITE_DESCRIPTION = "OFF es una plataforma editorial para una generación que busca crecimiento personal, salud mental, claridad, propósito y éxito profesional mientras construye su futuro sin perderse a sí misma.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "crecimiento personal", "salud mental", "éxito profesional", "desarrollo personal",
    "propósito", "claridad mental", "crisis de los 20", "sentirse perdido",
    "bienestar emocional", "autoconocimiento", "desarrollo profesional", "hábitos",
    "inteligencia emocional", "ansiedad por el futuro", "jóvenes profesionales",
    "generación z", "superación personal", "identidad personal", "OFF", "OFF Journal",
    "Nathalie Garcia", "cómo encontrar propósito", "cómo tener éxito sin sentirse vacío",
    "crisis existencial", "reconstruirte", "desconexión emocional",
  ],
  applicationName: "OFF",
  authors: [{ name: "Nathalie Garcia" }],
  creator: "Nathalie Garcia",
  publisher: "OFF",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "OFF",
    url: "/",
    locale: "es_MX",
    images: [{ url: "/images/hero-off.webp", alt: SITE_TITLE }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/hero-off.webp"],
  },
  icons: {
    icon: [
      {
        url: "/logo/favicon-off-black.png",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/logo/favicon-off.png",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
    ],
    shortcut: "/logo/favicon-off.png",
    apple: "/logo/favicon-off.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/cis3odw.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Serif+Display&family=Inter:wght@300;400;500;600;700;800&family=League+Spartan:wght@300;400;500;600;700;800&family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700;800&family=Oswald:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
