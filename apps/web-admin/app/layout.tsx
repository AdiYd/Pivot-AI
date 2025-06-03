import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { SideNav } from "@/components/layout/side-nav";


export const metadata: Metadata = {
  title: "פיבוט - ניהול מסעדות ומלאי",
  description: "מערכת ניהול מסעדות, ספקים ומלאי באמצעות WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`relative`}>
        {/* Background gradients for visual appeal */}
        <div className="fixed top-[-130px] left-[-210px] overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-green-500/30 to-orange-400/70 blur-[150px] z-0" />
        <div className="fixed bottom-[-130px] right-[-210px] overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-blue-400/90 to-purple-400-500/80 dark:from-blue-400/80 dark:to-purple-600/70 blur-[100px] z-0" />
        {/* <div className="fixed -bottom-1/2 right-1/5 hidden max-sm:block overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-blue-400/80 to-purple-400-500/50 dark:from-blue-400/50 dark:to-purple-600/40 blur-[100px] z-0" /> */}
        <div className="fixed -top-1/4 left-0 hidden max-sm:block overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-green-500/30 to-orange-400/60 blur-[100px] z-0" />
        <Providers>
          <div className="flex min-h-screen relative">
            <SideNav />
            <main className="flex-1 p-6 max-sm:p-4 max-sm:pt-10 overflow-auto max-h-screen">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
