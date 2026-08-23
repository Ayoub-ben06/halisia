import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halisia — Patrimoine halal",
  description: "Suivez votre patrimoine halal en un seul endroit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body>{children}</body>
    </html>
  );
}
