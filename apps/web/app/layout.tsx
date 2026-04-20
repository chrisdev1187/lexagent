import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AppProviders } from "@/providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  weight: "variable",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LexAgent — AI Legal Platform",
  description: "ARES v5 — Advanced Research & Evidence System for legal professionals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
