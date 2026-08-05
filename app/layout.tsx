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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="bg-fundo text-texto antialiased">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
