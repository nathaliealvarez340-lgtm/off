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
  icons: {
    icon: "/logo/favicon-off.png.jpeg",
    shortcut: "/logo/favicon-off.png.jpeg",
    apple: "/logo/favicon-off.png.jpeg",
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
