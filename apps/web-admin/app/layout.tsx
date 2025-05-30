import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { SideNav } from "@/components/layout/side-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "דף הבית",
  description: "לוח בקרה לניהול מסעדות, ספקים ומלאי",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className='relative'>
        <div className="fixed top-[-130px] left-[-210px] overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-green-500/40 to-orange-400/80 blur-[150px] z-0" />
        <div className="fixed bottom-[-130px] right-[-210px] overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-purple-700/80 to-teal-500/80 blur-[200px] z-0" />
        <Providers>
          <div className="flex min-h-screen relative">
            <SideNav />
            <main className="flex-1 p-6 pt-12 overflow-auto max-h-screen">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
