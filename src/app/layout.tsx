import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin", "vietnamese"], variable: "--font-lexend", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin", "vietnamese"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  title: "SafeVoice",
  description: "Confidential reports only an independent committee can open",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
