import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LenisProvider } from "@/components/ui/LenisProvider";

export const metadata: Metadata = {
  title: "Sentry — Prontidão Operacional",
  description:
    "Plataforma de prontidão operacional do centro cirúrgico. Verifique se ativos, salas e centros estão prontos para operar com segurança.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F2F2F7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-fundo text-texto antialiased">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
