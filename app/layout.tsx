import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "MSGSU DOT - Yılbaşı Etkinliği 2025",
  description: "Mimar Sinan Güzel Sanatlar Üniversitesi Dijital Oyun Topluluğu Yılbaşı Etkinliği",
  icons: {
    icon: "/dot-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
