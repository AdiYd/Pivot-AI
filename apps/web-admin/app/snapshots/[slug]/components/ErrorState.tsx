'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ErrorStateProps {
  error: string;
}

export default function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full min-w-[400px] max-sm:min-w-[90vw] max-w-[95vw] overflow-hidden">
          <div className="bg-red-50* p-4">
            <CardHeader className='!pb-2'>
              <CardTitle className="flex items-center text-center justify-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <span>שגיאה</span>
              </CardTitle>
              <CardDescription className='text-center'>לא ניתן לטעון את הדף</CardDescription>
            </CardHeader>
          </div>
          
          <CardContent className="!pt-2">
            <p className="text-center mb-2">{error}</p>
            
            <div className="flex flex-col space-y-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                נסה שנית
              </Button>
              
              <Link href="/" className="w-full">
                <Button variant="default" className="w-full">
                  חזרה לדף הבית
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
