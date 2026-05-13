import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/colors_and_type.css";
import "@/styles/components.css";
import { AppProviders } from "@/providers";
import { ThemeBody } from "@/components/layout/ThemeBody";
import { Metadata } from "next";

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
  title: "LexAgent — Enterprise Legal Intelligence",
  description: "Advanced AI orchestration for complex legal matters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`lex-app ${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <AppProviders>
        <ThemeBody>{children}</ThemeBody>
      </AppProviders>
    </html>
  );
}
