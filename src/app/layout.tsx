import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Draw - Dibuja, sin límites",
  description:
    "Vórtex Draw, de Vortex Company: dibujo libre en tu navegador con pincel, borrador, formas, relleno, texto y cuentagotas. Deshacer/rehacer, exporta en PNG/JPG y guarda tus proyectos. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex Draw",
    "dibujar online",
    "app de dibujo",
    "pincel digital",
    "editor de dibujo gratis",
    "dibujo sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ec4899" stroke-width="3.5"/><path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke="#f472b6" stroke-width="3.5" stroke-linecap="round"/><path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke="#f472b6" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#f472b6"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Draw - Dibuja, sin límites",
    description:
      "Dibujo libre con pincel, formas, relleno y texto. Exporta PNG/JPG y guarda proyectos. Gratis, sin anuncios y 100% local. De Vortex Company, la misma compañía de Vórtex Music.",
    siteName: "Vórtex Draw",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
