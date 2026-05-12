"use client";

import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/colors_and_type.css";
import "@/styles/components.css";
import { AppProviders } from "@/providers";
import { CommandBar } from "@/components/layout/command-bar/CommandBar";
import { useSettings } from "@/providers/settings-provider";

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

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { settings, loaded } = useSettings();

  const themeClass = loaded && settings.theme === "professional" ? "theme-professional" : "";

  return (
    <body className={`font-sans antialiased ${themeClass}`} style={{ background: "var(--bg)", color: "var(--text)" }}>
      <CommandBar />
      {children}
    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`lex-app ${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <AppProviders>
        <LayoutInner>{children}</LayoutInner>
      </AppProviders>
    </html>
  );
}
