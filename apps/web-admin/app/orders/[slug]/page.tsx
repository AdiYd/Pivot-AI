'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Order, Restaurant } from '@/schema/types';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import OrderDetails from './components/OrderDetails';
import OrderNotFound from './components/OrderNotFound';

export default function OrderPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function fetchOrderData() {
      try {
        if (!slug || typeof slug !== 'string') {
          throw new Error('מזהה הזמנה לא תקין');
        }

        // Determine the collection name based on the order ID suffix
        const isSimulator = slug.endsWith('smltr');
        const collectionName = isSimulator ? 'orders_simulator' : 'orders';

        // Fetch the order document
        const orderDoc = await getDoc(doc(db, collectionName, slug));
        console.log('Fetched order document:', orderDoc.id, 'from',collectionName, orderDoc.exists());
        if (!orderDoc.exists()) {
          throw new Error('הזמנה לא נמצאה');
        }

        const orderData = orderDoc.data() as Order;
        setOrder(orderData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'אירעה שגיאה בטעינת ההזמנה');
        setLoading(false);
      }
    }

    fetchOrderData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">טוען פרטי הזמנה...</p>
          <p className="text-sm text-muted-foreground">אנא המתן</p>
        </motion.div>
      </div>
    );
  }

  if (error || !order) {
    return <OrderNotFound error={error || 'לא ניתן למצוא את ההזמנה המבוקשת'} />;
  }

  return <OrderDetails order={order} />;
}
