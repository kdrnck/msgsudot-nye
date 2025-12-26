import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "MSGSU DOT - Yılbaşı Etkinliği 2026",
  description: "Mimar Sinan Güzel Sanatlar Üniversitesi Dijital Oyun Topluluğu Yılbaşı Etkinliği",
  icons: {
    icon: [
      { rel: "icon", url: "/dot-logo.png", sizes: "any" },
      { rel: "shortcut icon", url: "/dot-logo.png" },
      { rel: "apple-touch-icon", url: "/dot-logo.png" },
    ],
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
