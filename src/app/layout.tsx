import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { Providers } from "./providers";
import { Chrome } from "./ui";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "vietnamese"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "SafeVoice",
  description: "Confidential reports only an independent committee can open",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

// Runs before first paint: the intro curtain plays once per tab, not on every reload.
const INTRO_ONCE = `try{if(sessionStorage.getItem("safevoice.intro"))document.documentElement.dataset.intro="seen";else sessionStorage.setItem("safevoice.intro","1")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_ONCE }} />
      </head>
      <body>
        <Providers>
          <Chrome>{children}</Chrome>
        </Providers>
      </body>
    </html>
  );
}
