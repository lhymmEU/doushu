import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangShell } from "@/components/system/LangShell";
import "./globals.css";

// Self-hosted via `next/font/local` instead of `next/font/google`. The
// google variant tries to fetch from fonts.gstatic.com at build/dev time,
// which is slow + flaky in mainland China and was breaking `next dev`
// (Turbopack would time out and fail to resolve
// `@vercel/turbopack-next/internal/font/google/font`). Source files live
// in `app/fonts/` — Inter Variable (latin, weight axis 100-900) and three
// Cormorant Garamond weights from the `@fontsource` mirror on jsDelivr.
const display = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const sans = localFont({
  src: "./fonts/inter-variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "豆书 · Doushu — A 3000-copy mini-book co-publishing event",
  description:
    "A handmade mini-book from Wuhan. Find your serial, claim your copy, and help bring the print run to life.",
  applicationName: "Doushu",
  authors: [{ name: "Doushu Press" }],
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#F8F4ED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col bg-paper text-ink">
        <TooltipProvider delayDuration={150}>
          <Suspense fallback={<div className="relative z-10 flex flex-1 flex-col" />}>
            <LangShell>
              <div className="relative z-10 flex flex-1 flex-col">
                {children}
              </div>
            </LangShell>
          </Suspense>
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast:
                  "border-hairline bg-paper text-ink shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
