import { ThemeToggle } from '@/components/theme-toggle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'אנשי קשר',
  description: 'הגדרת אנשי קשר',
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
