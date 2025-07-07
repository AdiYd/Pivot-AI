import { ThemeToggle } from '@/components/theme-toggle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'פרטי הזמנה',
  description: 'צפייה בפרטי הזמנה',
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
      <div className="max-w-5xl mx-auto py-8">
        {children}
      </div>
    </div>
  );
}
