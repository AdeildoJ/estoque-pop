import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estoque Hospital",
  description: "Controle de estoque do hospital",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
