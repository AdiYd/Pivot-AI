import { ThemeToggle } from '@/components/theme-toggle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ספירת מלאי והזמנה',
  description: 'מערכת ספירת מלאי והזמנה לניהול מלאי המסעדה',
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className=" bg-gray-50* dark:bg-gray-900*">
      <div className='absolute top-4 left-4'>
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
