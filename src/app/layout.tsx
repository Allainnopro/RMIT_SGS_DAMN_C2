import type { Metadata, Viewport } from "next";
import { Sora, Source_Sans_3 } from "next/font/google";
import { Providers } from "./providers";
import { Chrome } from "./ui";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin", "vietnamese"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  title: "SafeVoice",
  description: "Confidential reports only an independent committee can open",
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${sourceSans.variable}`}>
      <body>
        <Providers>
          <Chrome>{children}</Chrome>
        </Providers>
      </body>
    </html>
  );
}
