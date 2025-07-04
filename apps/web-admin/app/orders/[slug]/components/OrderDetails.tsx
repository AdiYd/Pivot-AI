'use client';

import { Order, Restaurant, Supplier } from '@/schema/types';
import { motion } from 'framer-motion';
import { CATEGORIES_DICT } from '@/schema/states';
import { Calendar, Check, Download, Phone, Mail, ArrowLeft, Loader } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { useState } from 'react';
import { generateOrderPdf } from './pdfConverter';

// Hebrew translations for fields
const hebrewFields = {
  role: 'תפקיד',
  roles: {
    owner: 'בעלים',
    manager: 'מנהל',
    chef: 'שף',
    shift: 'משמרת',
    employee: 'עובד',
    supplier: 'ספק'
  }
};

// Status translations
const statusTranslations: Record<string, string> = {
  pending: 'ממתין לאישור',
  confirmed: 'אושר',
  sent: 'נשלח',
  delivered: 'נמסר',
  cancelled: 'בוטל'
};

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  sent: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

interface OrderDetailsProps {
  order: Order;
//   restaurant: Restaurant | null;
//   supplier: Supplier | undefined;
}

export default function OrderDetails({ order }: OrderDetailsProps) {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getStatusBadge = (status: string) => {
    const bgColor = statusColors[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
        {statusTranslations[status] || status}
      </span>
    );
  };

    const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateOrderPdf('order-content', `order-${order.id}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header with order number and status */}
      <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(order.status)}
          </div>
          <h1 className="text-2xl font-bold">הזמנה מספר {order.id}</h1>
           נוצר בתאריך: {formatFirebaseTimestamp(order.createdAt)}
        </div>
        
        <div className="mt-4 sm:mt-0">
           <Button 
            className="flex items-center gap-2" 
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? <Loader className='animate-spin duration-1000'  /> : <Download size={16} />}
            {isGeneratingPdf ? 'מכין PDF...' : 'הורד PDF'}
          </Button>
        </div>
      </div>

    <div id="order-content">
      {/* Restaurant and supplier info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant info */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-muted-foreground">פרטי מסעדה</h3>
          <div className="bg-card p-4 rounded-lg border*">
            <p className="font-medium">{order.restaurant.name}</p>
            {/* {restaurant && <p className="text-sm text-muted-foreground">{restaurant.legalName}</p>} */}
            <p className="text-sm text-muted-foreground">מספר ח.פ: {order.restaurant.legalId}</p>
            
            {/* Contact info */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">איש קשר</p>
              <p className="text-sm">{order.restaurant.contact.name}</p>
              <p className="text-sm">
                {hebrewFields.role}: {
                  hebrewFields.roles[order.restaurant.contact.role as keyof typeof hebrewFields.roles] || 
                  order.restaurant.contact.role
                }
              </p>
              
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{order.restaurant.contact.whatsapp}</p>
              </div>
              
              {order.restaurant.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{order.restaurant.contact.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Supplier info */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-muted-foreground">פרטי ספק</h3>
          <div className="bg-card p-4 rounded-lg border*">
            <p className="font-medium">{order.supplier.name}</p>
            
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{order.supplier.whatsapp}</p>
            </div>
            
            {order.supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{order.supplier.email}</p>
              </div>
            )}
            
            {order.category && (
              <p className="text-sm text-muted-foreground mt-1">
                קטגוריות: {order.category.map(cat => CATEGORIES_DICT[cat]?.name || cat).join(', ')}
              </p>
            )}
            
            {/* Delivery info */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">מועד אספקה מתוכנן</p>
              <p className="text-sm font-medium">
                {order.timeToDeliver || 'לא צוין מועד אספקה'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {order.midweek ? 'הזמנה לאמצע השבוע' : 'הזמנה לסוף השבוע'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Products table */}
      <div className="mt-6">
        <h3 className="text-base font-medium text-muted-foreground mb-2">מוצרים שהוזמנו</h3>
        
        <div className="bg-card rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3 text-right whitespace-nowrap font-medium">מוצר</th>
                <th className="p-3 text-right whitespace-nowrap">כמות</th>
                <th className="p-3 text-right whitespace-nowrap">יחידה</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr 
                  key={`${item.name}-${index}`} 
                  className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{item.qty}</td>
                  <td className="p-3">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Shortages table if there are any */}
      {order.shortages && order.shortages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-medium text-red-500 mb-2">חוסרים ({order.shortages.length})</h3>
          
          <div className="bg-card rounded-lg border* border-red-200 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-red-800">
                <tr>
                  <th className="p-3 text-right whitespace-nowrap font-medium">מוצר</th>
                  <th className="p-3 text-right whitespace-nowrap">כמות מבוקשת</th>
                  <th className="p-3 text-right whitespace-nowrap">כמות שסופקה</th>
                  <th className="p-3 text-right whitespace-nowrap">חסר</th>
                </tr>
              </thead>
              <tbody>
                {order.shortages.map((item, index) => (
                  <tr 
                    key={`shortage-${item.name}-${index}`} 
                    className="border-b last:border-b-0 hover:bg-red-50/50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.emoji}</span>
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3">{item.requestedQty}</td>
                    <td className="p-3">{item.deliveredQty}</td>
                    <td className="p-3 font-medium text-red-500">
                      {item.requestedQty - item.deliveredQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Notes section if there are any */}
      {(order.restaurantNotes || order.supplierNotes) && (
        <div className="space-y-4 mt-6">
          {order.restaurantNotes && (
            <div className="bg-muted/20 p-4 rounded-lg border* border-blue-200">
              <h3 className="text-base font-medium text-blue-800 mb-2">הערות מסעדה</h3>
              <p className="text-sm whitespace-pre-wrap">{order.restaurantNotes}</p>
            </div>
          )}
          
          {order.supplierNotes && (
            <div className="bg-muted/20 p-4 rounded-lg border* border-green-200">
              <h3 className="text-base font-medium text-green-800 mb-2">הערות ספק</h3>
              <p className="text-sm whitespace-pre-wrap">{order.supplierNotes}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Order lifecycle / status */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-base font-medium mb-4">סטטוס הזמנה</h3>
        
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className={`flex flex-col items-center ${order.status === 'pending' || order.status === 'confirmed' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full ${order.status === 'pending' || order.status === 'confirmed' ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center`}>
              <Check className="w-5 h-5" />
            </div>
            <p className="mt-2 text-xs">אושר</p>
          </div>
          
          <div className={`flex-1 h-1 ${order.status === 'confirmed' ? 'bg-green-500' : 'bg-gray-200'}`} />
          
        
        </div>
        
        {order.deliveredAt && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              <p>התקבל בתאריך: {new Date(order.deliveredAt).toLocaleDateString('he-IL')}, {new Date(order.deliveredAt).toLocaleTimeString('he-IL')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </motion.div>
  );
}


const formatFirebaseTimestamp = (timestamp: any) => {
  if (!timestamp) return 'תאריך לא זמין';
  
  try {
    // If it's a Firebase Timestamp
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return `${date.toLocaleDateString('he-IL')}, ${date.toLocaleTimeString('he-IL')}`;
    }
    
    // Try regular Date constructor as fallback
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'תאריך לא תקין';
    return `${date.toLocaleDateString('he-IL')}, ${date.toLocaleTimeString('he-IL')}`;
  } catch {
    return 'תאריך לא תקין';
  }
};