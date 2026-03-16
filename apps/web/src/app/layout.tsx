import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"]
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Elite Veiculos CRM Atendimento",
  description: "CRM omnichannel da Elite Veiculos com Inbox, CRM, Reports e Settings em uma base operacional unificada."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${bodyFont.variable} ${displayFont.variable}`} lang="pt-BR" suppressHydrationWarning>
      <body style={{ fontFamily: "var(--font-body)" }}>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}