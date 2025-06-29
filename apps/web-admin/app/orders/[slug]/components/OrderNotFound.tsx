'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface OrderNotFoundProps {
  error: string;
}

export default function OrderNotFound({ error }: OrderNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full min-w-[350px] max-w-[450px] overflow-hidden">
          <div className="bg-amber-50 p-6 flex justify-center">
            <Package className="h-16 w-16 text-amber-500" />
          </div>
          
          <CardHeader>
            <CardTitle className="text-center text-amber-700">
              הזמנה לא נמצאה
            </CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              ייתכן כי ההזמנה שאתה מחפש הוסרה או שמזהה ההזמנה אינו תקין.
            </p>
            
            <div className="flex flex-col space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                נסה שנית
              </Button>
              
              <Link href="/orders" className="w-full">
                <Button variant="default" className="w-full">
                  חזרה לרשימת ההזמנות
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
