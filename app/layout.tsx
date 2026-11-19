import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import Intro from "@/components/Intro";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI SkinWise",
  description: "Scan a skin concern with AI and get guidance in seconds.",
  icons: { icon: "/assets/app_logo.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#005DA1" };

// Runs before first paint. Skips the intro only where it would be noise: inside an iframe (the live previews
// and the video renderer) and with ?still or ?nointro. It plays on every full page load, including reloads;
// client-side navigation keeps this layout mounted, so it never replays between pages.
const SKIP_INTRO = `(function(){try{var d=document.documentElement;if(top!==self||/[?&](still|nointro)(&|=|$)/.test(location.search))d.setAttribute('data-intro','off')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script above adds data-intro to <html> before React hydrates.
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Critical: the intro must cover the page from the very first paint, before the stylesheet arrives. */}
        <style dangerouslySetInnerHTML={{ __html: ".intro{position:fixed;inset:0;z-index:100;background:#fff}html[data-intro=off] .intro{display:none}" }} />
        <script dangerouslySetInnerHTML={{ __html: SKIP_INTRO }} />
      </head>
      <body>
        <Intro />
        <Header />
        {children}
      </body>
    </html>
  );
}
