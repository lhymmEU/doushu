import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangShell } from "@/components/system/LangShell";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
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
