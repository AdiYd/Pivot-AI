import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedLayout } from "@/components/layout/protected-layout";

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
      <body className="relative">
        <Providers>
            <ProtectedLayout>
              {children}
            </ProtectedLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
