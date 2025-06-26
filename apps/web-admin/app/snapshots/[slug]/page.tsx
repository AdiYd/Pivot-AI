'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Restaurant, Supplier} from '@/schema/types';
import InventorySnapshotForm from './components/InventorySnapshotForm';
import ErrorState from './components/ErrorState';
import { Button, Input } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Send, ArrowRight, SendHorizonal, Check, Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { UNITS_DICT } from '@/schema/states';
import { OrderSchema } from '@/schema/schemas';

// Hebrew translations for contact fields
const hebrewFields = {
  name: 'שם',
  whatsapp: 'מספר טלפון',
  role: 'תפקיד',
  email: 'אימייל',
  roles: {
    owner: 'בעלים',
    manager: 'מנהל',
    chef: 'שף',
    shift: 'משמרת',
    employee: 'עובד',
    supplier: 'ספק'
  }
};

// JWT payload interface
interface JWTPayload {
  restaurantId: string;
  contact: {
    name: string;
    whatsapp: string;
    role: string;
    email?: string;
  };
  orderId: string;
}

// Main page component
export default function OrderPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [jwtData, setJwtData] = useState<JWTPayload | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [calculatedOrder, setCalculatedOrder] = useState<any | null>(null);
  
  // Add state for midweek/weekend distinction
  const [isMidweekOrder, setIsMidweekOrder] = useState<boolean>(() => {
    // Default based on current day (Sat-Wed: midweek, Thu-Fri: weekend)
    const today = new Date().getDay();
    // In Israel, weekend is Thursday(4) and Friday(5)
    return !(today === 4 || today === 5);
  });

  // Decode JWT and fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        // Decode JWT
        if (!slug || typeof slug !== 'string') {
          throw new Error('קישור לא תקין');
        }
        // Decode the JWT
        const decoded = jwtDecode(slug) as JWTPayload;
        // console.log('Decoded JWT:', decoded);
        setJwtData(decoded);

        if (!decoded.restaurantId || !decoded.orderId) {
          throw new Error('חסרים פרטים בקישור');
        }

        // Fetch restaurant data from Firestore
        const restaurantDoc = await getDoc(doc(db, 'restaurants_simulator', decoded.restaurantId));
        if (!restaurantDoc.exists()) {
          throw new Error('לא נמצאה מסעדה מתאימה');
        }

        setRestaurant(restaurantDoc.data() as Restaurant);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'אירעה שגיאה בטעינת הנתונים');
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setCalculatedOrder(null); // Reset calculated order when switching suppliers
  };

  // Toggle between midweek and weekend order types
  const toggleOrderType = () => {
    setIsMidweekOrder(!isMidweekOrder);
  };

  const handleSubmitSnapshot = (snapshotData: any) => {
    // Calculate recommended order based on the snapshot data
    const calculatedItems = snapshotData.products.map((product: any) => {
      const currentQty = parseFloat(product.currentQty || 0) || 0;
      // Use the par level based on midweek/weekend setting rather than day of week
      const baseQty = isMidweekOrder ? product.parMidweek : product.parWeekend;
      const recommendedQty = Math.max(0, baseQty - currentQty);

      return {
        ...product,
        midweek: isMidweekOrder, // Use our explicit state rather than inferring
        recommendedQty,
        orderQty: recommendedQty // Initial order quantity equals recommended
      };
    });

    // Calculate next delivery date - always 10:00 AM next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    // Get day name for context
    const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][tomorrow.getDay()];

    const dateToDeliver = {
      day: dayOfWeek,
      date: tomorrow.toISOString().split('T')[0],
      time: '10:00'
    };

    const calculatedOrderData = {
      ...snapshotData,
      products: calculatedItems,
      dateToDeliver,
      timestamp: new Date().toISOString(),
      restaurantNotes: '', // Initialize empty notes
      midweek: isMidweekOrder // Store whether this is a midweek order
    };

    setCalculatedOrder(calculatedOrderData);
  };

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
          <p className="text-lg font-medium">טוען נתונים...</p>
          <p className="text-sm text-muted-foreground">אנא המתן</p>
        </motion.div>
      </div>
    );
  }

  if (error || !restaurant || !jwtData) {
    return <ErrorState error={error || 'אירעה שגיאה בטעינת הנתונים'} />;
  }

  return (
    <div className="min-h-scree">
      <div className="max-w-5xl mx-auto px-0 py-8">
        {calculatedOrder ? (
          <OrderSummary 
            calculatedOrder={calculatedOrder} 
            restaurant={restaurant}
            contact={jwtData.contact}
            supplier={selectedSupplier!}
            onBack={() => setCalculatedOrder(null)}
          />
        ) : (
          <InventorySnapshotForm
            restaurant={restaurant}
            contact={jwtData.contact}
            suppliers={restaurant.suppliers || []}
            selectedSupplier={selectedSupplier}
            onSelectSupplier={handleSelectSupplier}
            onSubmitSnapshot={handleSubmitSnapshot}
            orderId={jwtData.orderId}
            isMidweekOrder={isMidweekOrder}
            toggleOrderType={toggleOrderType}
          />
        )}
      </div>
    </div>
  );
}

// Order summary component to display after form submission
function OrderSummary({ 
  calculatedOrder, 
  restaurant, 
  contact, 
  supplier,
  onBack 
}: { 
  calculatedOrder: any;
  restaurant: Restaurant;
  contact: JWTPayload['contact'];
  supplier: Supplier;
  onBack: () => void;
}) {
  // Add state for edit mode and notes visibility
  const [isEditing, setIsEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editedOrder, setEditedOrder] = useState({ ...calculatedOrder });
  const [newProduct, setNewProduct] = useState({ name: '', emoji: '📦', unit: 'pcs', orderQty: 1 });
  
  // Input refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Filter products that have order quantities > 0 (for display in non-edit mode)
  const productsToOrder = isEditing 
    ? editedOrder.products.filter((p: any) => 
        parseFloat(p.recommendedQty || 0) > 0 || p.orderQty !== undefined
      )
    : editedOrder.products.filter((p: any) => 
        parseFloat(p.orderQty || 0) > 0
      );

  const hasItemsToOrder = productsToOrder.length > 0;

  // Handle delivery date change
  const handleDateChange = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    
    // Get the day of the week
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dateObj.getDay()];
    
    setEditedOrder({
      ...editedOrder,
      dateToDeliver: {
        ...editedOrder.dateToDeliver,
        day: dayOfWeek,
        date: date // Store the full date
      }
    });
  };

  // Handle time change
  const handleTimeChange = (time: string) => {
    setEditedOrder({
      ...editedOrder,
      dateToDeliver: {
        ...editedOrder.dateToDeliver,
        time
      }
    });
  };

  // Handle notes change
  const handleNotesChange = (notes: string) => {
    setEditedOrder({
      ...editedOrder,
      restaurantNotes: notes
    });
  };

  // Handle product quantity change
  const handleProductQtyChange = (index: number, value: string) => {
    // Only allow numbers and a single decimal point
    const regex = /^(\d*\.?\d*)$/;
    if (!regex.test(value) && value !== '') return;
    
    const updatedProducts = [...editedOrder.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      orderQty: value === '' ? 0 : Number(value) // Ensure we convert to number or default to 0
    };

    setEditedOrder({
      ...editedOrder,
      products: updatedProducts
    });
  };

  // Handle key down for better UX (move to next input on Enter)
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
        inputRefs.current[nextIndex]?.select();
      }
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = e.key === "ArrowDown" ? index + 1 : index - 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
        inputRefs.current[nextIndex]?.select();
      }
    }
  };

  // Handle adding new product
  const handleAddProduct = () => {
    if (!newProduct.name.trim() || newProduct.orderQty <= 0) return;

    const updatedProducts = [...editedOrder.products];
    updatedProducts.push({
      name: newProduct.name,
      emoji: newProduct.emoji,
      unit: newProduct.unit,
      orderQty: newProduct.orderQty,
      recommendedQty: 0,
      currentQty: 0,
      parMidweek: 0,
      parWeekend: 0
    });

    setEditedOrder({
      ...editedOrder,
      products: updatedProducts
    });

    // Reset new product form
    setNewProduct({ name: '', emoji: '📦', unit: 'pcs', orderQty: 1 });
    setAddingProduct(false);
  };

  // Handle saving changes
  const handleSaveChanges = () => {
    // Filter out products with 0 quantity when saving
    const filteredProducts = editedOrder.products.filter((p: any) => 
      parseFloat(p.orderQty || 0) > 0 || 
      // Keep products that have a recommended quantity for future edits
      (parseFloat(p.recommendedQty || 0) > 0 && p.orderQty === undefined)
    );
    
    setEditedOrder({
      ...editedOrder,
      products: filteredProducts
    });

    // In a real implementation, you would send the updated order to the server
    // For now, we'll just update the local state
    calculatedOrder.dateToDeliver = editedOrder.dateToDeliver;
    calculatedOrder.restaurantNotes = editedOrder.restaurantNotes;
    calculatedOrder.products = filteredProducts;
    console.log('Order saved:', calculatedOrder.products);
    
    setIsEditing(false);
    setAddingProduct(false);
  };

  // Generate today's date in YYYY-MM-DD format for the date input default
  const today = new Date().toISOString().split('T')[0];

  // Generate delivery date from day name (for display or setting default)
  const getDateFromDayName = (dayName: string): string => {
    const daysMap: Record<string, number> = { 
      'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 
    };
    
    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = daysMap[dayName];
    
    // Calculate days to add (0 to 6)
    const daysToAdd = (targetDay - todayDay + 7) % 7;
    
    // If today is the target day, we want the next occurrence (add 7 days)
    const finalDaysToAdd = daysToAdd === 0 ? 7 : daysToAdd;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + finalDaysToAdd);
    
    return targetDate.toISOString().split('T')[0];
  };

  // Initialize delivery date in the edited order if it doesn't exist
  useEffect(() => {
    if (editedOrder.dateToDeliver && editedOrder.dateToDeliver.day && !editedOrder.dateToDeliver.date) {
      const deliveryDate = getDateFromDayName(editedOrder.dateToDeliver.day);
      setEditedOrder((prev: any) => ({
        ...prev,
        dateToDeliver: {
          ...prev.dateToDeliver,
          date: deliveryDate
        }
      }));
    }
  }, [editedOrder.dateToDeliver]);

  // Function to transform the order data to match the OrderSchema
  const prepareOrderData = (): any => {
    // Always set delivery time to 10:00 AM next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const timeToDeliver = `${tomorrow.toLocaleDateString('he-IL')} בשעה 10:00`;
    
    if (!timeToDeliver) {
      throw new Error('חסר זמן אספקה');
    }

    // Transform products array to match the items array in OrderSchema
    // Filter products with quantity > 0
    const items = editedOrder.products
      .filter((p: any) => parseFloat(p.orderQty || 0) > 0)
      .map((p: any) => ({
        name: p.name,
        unit: p.unit,
        emoji: p.emoji,
        qty: parseFloat(p.orderQty || 0),
      }));
    
    if (items.length === 0) {
      throw new Error('אין מוצרים להזמנה');
    }

    // Prepare the order data according to OrderSchema
    return {
      id: calculatedOrder.orderId,
      category: supplier.category,
      supplier: {
        whatsapp: supplier.whatsapp,
        name: supplier.name,
        ...(supplier.email && { email: supplier.email })
      },
      restaurant: {
        legalId: restaurant.legalId,
        name: restaurant.name,
        contact: {
          whatsapp: contact.whatsapp,
          name: contact.name,
          role: contact.role,
          ...(contact.email && { email: contact.email })
        }
      },
      status: "pending",
      items,
      shortages: [], // Initialize with empty array
      midweek: calculatedOrder.midweek,
      timeToDeliver,
      restaurantNotes: editedOrder.restaurantNotes || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const handleSendOrder = () => {
    try {
      // Transform the order data to match the OrderSchema
      const orderData = prepareOrderData();
      const parsedOrderData = OrderSchema.parse(orderData);
      // Log the prepared order data
      console.log('Sending order:', parsedOrderData);
      
      // Here you would send the order data to your backend
      // For example:
      // sendOrderToFirestore(orderData).then(() => {
      //   // Show success message
      //   toast.success('ההזמנה נשלחה בהצלחה');
      //   onBack(); // Navigate back to inventory form
      // }).catch(error => {
      //   console.error('Error sending order:', error);
      //   toast.error('אירעה שגיאה בשליחת ההזמנה');
      // });
      
      // For now, just show a success message
      alert('ההזמנה נשלחה בהצלחה (הודעה לצורך הדגמה)');
    } catch (error) {
      console.error('Error preparing order:', error);
      alert(error instanceof Error ? error.message : 'אירעה שגיאה בהכנת ההזמנה');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header with title and edit button */}
      <div className="border-b pb-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">סיכום הזמנה</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground mt-1">נוצר ב-{new Date(calculatedOrder.timestamp).toLocaleDateString('he-IL')}</p>
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm"
            onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
            className="mr-auto flex items-center gap-2"
          >
            {isEditing ? (
              <>
                <Check size={16} />
                שמור שינויים
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                  <path d="m15 5 4 4"></path>
                </svg>
                ערוך הזמנה
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Info section with restaurant, supplier, contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant info */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2"
        >
          <h2 className="text-base font-medium text-muted-foreground">פרטי מסעדה</h2>
          <div className="bg-card p-4 rounded-lg shadow-sm*">
            <p className="font-medium">{restaurant.name}</p>
            <p className="text-sm text-muted-foreground">{restaurant.legalName}</p>
            <p className="text-sm text-muted-foreground">מספר ח.פ: {restaurant.legalId}</p>
            
            {/* Contact info */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">איש קשר</p>
              <p className="text-sm">{contact.name}</p>
              <p className="text-sm">{hebrewFields.role}: {hebrewFields.roles[contact.role as keyof typeof hebrewFields.roles] || contact.role}</p>
              <p className="text-sm">{contact.whatsapp}</p>
              {contact.email && <p className="text-sm">{contact.email}</p>}
            </div>
          </div>
        </motion.div>
        
        {/* Supplier and delivery info */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-2"
        >
          <h2 className="text-base font-medium text-muted-foreground">פרטי ספק</h2>
          <div className="bg-card p-4 rounded-lg shadow-sm*">
            <p className="font-medium">{supplier.name}</p>
            <p className="text-sm">{supplier.whatsapp}</p>
            {supplier.email && <p className="text-sm">{supplier.email}</p>}
            <p className="text-sm text-muted-foreground">{supplier.category.join(', ')}</p>
            
            {/* Delivery info */}
            {(calculatedOrder.dateToDeliver || editedOrder.dateToDeliver) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">מועד אספקה מומלץ</p>
                {isEditing ? (
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={editedOrder.dateToDeliver?.date || today}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-auto text-sm"
                        min={today}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={(editedOrder.dateToDeliver || calculatedOrder.dateToDeliver).time}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-24 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">
                    {editedOrder.dateToDeliver?.date 
                      ? `${new Date(editedOrder.dateToDeliver.date).toLocaleDateString('he-IL')} (${getDayName(editedOrder.dateToDeliver.day)})` 
                      : `יום ${getDayName(editedOrder.dateToDeliver?.day || calculatedOrder.dateToDeliver?.day)}`}
                    ,{' '}בשעה {editedOrder.dateToDeliver?.time || calculatedOrder.dateToDeliver?.time}
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Products table */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6"
      >
        <h2 className="text-base font-medium text-muted-foreground mb-2">פירוט הזמנה</h2>
        
        {hasItemsToOrder ? (
          <div className="bg-card rounded-lg shadow-sm overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-right whitespace-nowrap font-medium">מוצר</th>
                  {!isEditing && <th className="p-3 text-right whitespace-nowrap font-medium">מלאי</th>}
                  {!isEditing && <th className="p-3 text-right whitespace-nowrap font-medium">בסיס</th>}
                  <th className="p-3 text-right whitespace-nowrap">להזמנה</th>
                </tr>
              </thead>
              <tbody>
                {productsToOrder.map((product: any, index: number) => (
                  <motion.tr 
                    key={`${product.name}-${index}`} 
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{product.emoji}</span>
                        <span>{product.name}</span>
                      </div>
                    </td>
                    {!isEditing && <td className="p-3 max-sm:text-xs">{product.currentQty || '-'} </td>}
                    {!isEditing && <td className="p-3 max-sm:text-xs">{!isNaN(product.parMidweek) && !isNaN(product.parWeekend) ? 
                      (product.midweek ? product.parMidweek : product.parWeekend) : '-'} </td>}
                    <td className="p-3 font-semibold max-sm:text-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            ref={(el) => {
                              inputRefs.current[index] = el;
                            }}
                            value={product.orderQty === 0 ? '0' : (product.orderQty || '')}
                            onChange={(e) => handleProductQtyChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-16 text-center"
                            dir="ltr"
                            inputMode="decimal"
                          />
                          <span className='text-xs'>{UNITS_DICT[product.unit] || product.unit}</span>
                        </div>
                      ) : (
                        `${product.orderQty || product.recommendedQty} ${UNITS_DICT[product.unit] || product.unit}`
                      )}
                    </td>
                  </motion.tr>
                ))}

                {/* Add new product row (only visible in edit mode) */}
                {isEditing && (
                  <motion.tr 
                    className="border-b last:border-b-0 bg-muted/10 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="p-3">
                      {!addingProduct ? 
                      <div 
                      onClick={()=>setAddingProduct(true)}
                      className="flex items-center justify-center gap-1 h-full">
                          <Plus  className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">הוסף מוצר חדש
                        </span>
                      </div> :
                      <div className="flex items-center gap-2">
                        {/* <span className="text-lg">{newProduct.emoji}</span> */}
                          <select
                          value={newProduct.emoji}
                          onChange={(e) => setNewProduct({...newProduct, emoji: e.target.value})}
                          className="p-1 border rounded text-lg"
                        >
                          <option value="📦">📦</option>
                          <option value="🥬">🥬</option>
                          <option value="🥩">🥩</option>
                          <option value="🍗">🍗</option>
                          <option value="🥚">🥚</option>
                          <option value="🧀">🧀</option>
                          <option value="🥫">🥫</option>
                          <option value="🍶">🍶</option>
                          <option value="🍞">🍞</option>
                          <option value="🍎">🍎</option>
                          <option value="🍌">🍌</option>
                          <option value="🍊">🍊</option>
                          <option value="🍇">🍇</option>
                          <option value="🍓">🍓</option>
                        </select>
                        <Input
                          type="text"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="שם המוצר"
                          className="w-32"
                          ref={(el) => {
                            inputRefs.current[productsToOrder.length] = el;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newProduct.name && newProduct.orderQty > 0) {
                              e.preventDefault();
                              handleAddProduct();
                            }
                          }}
                        />
                      </div>}
                    </td>
                    <td colSpan={!isEditing ? 3 : 1} className="p-3 font-semibold">
                      {isEditing && addingProduct && <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={newProduct.orderQty}
                          onChange={(e) => {
                            const regex = /^(\d*\.?\d*)$/;
                            if (regex.test(e.target.value) || e.target.value === '')
                              setNewProduct({...newProduct, orderQty: Number(e.target.value)})
                          }}
                          className="w-16 text-center"
                          dir="ltr"
                          inputMode="decimal"
                          ref={(el) => {
                            inputRefs.current[productsToOrder.length + 1] = el;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newProduct.name && newProduct.orderQty > 0) {
                              e.preventDefault();
                              handleAddProduct();
                              // Focus back on the name input after adding
                              setTimeout(() => {
                                inputRefs.current[productsToOrder.length]?.focus();
                              }, 0);
                            }
                          }}
                        />
                        <select
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                          className="p-1 border rounded"
                        >
                          {Object.entries(UNITS_DICT).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                          ))}
                        </select>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleAddProduct}
                          disabled={!newProduct.name.trim() || newProduct.orderQty <= 0}
                        >
                          הוסף
                        </Button>
                      </div>}
                    </td>
                  </motion.tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card p-6 rounded-lg shadow-sm text-center">
            <p className="text-muted-foreground">הכמויות במלאי מספיקות, אין צורך בהזמנה כרגע.</p>
          </div>
        )}
      </motion.div>
      
      {/* Notes section with collapsible UI */}
      <div className="mt-4">
        <button 
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-2 text-sm font-medium hover:underline text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          רוצה להוסיף הערה?
          {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card p-4 rounded-lg overflow-hidden"
            >
              <h2 className="text-base font-medium text-muted-foreground mb-2">הערות למשלוח</h2>
                <textarea
                  value={editedOrder.restaurantNotes || ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={3}
                  placeholder="הוסף הערות למשלוח כאן..."
                  className="w-full p-2 border rounded-md"
                  maxLength={500}
                />
             
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
          disabled={isEditing}
        >
          <ArrowRight size={16} />
          חזרה לספירת המלאי
        </Button>
        
        {hasItemsToOrder && !isEditing && (
          <Button onClick={handleSendOrder} className="flex items-center gap-2">
            שלח הזמנה
            <SendHorizonal className='rotate-180' size={16} />
          </Button>
        )}
        {isEditing && (
          <Button variant="default" onClick={handleSaveChanges}>
            <Check size={16} />
            שמור שינויים
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Helper function to get day name in Hebrew
function getDayName(day: string): string {
  const dayNames: Record<string, string> = {
    'sun': 'ראשון',
    'mon': 'שני',
    'tue': 'שלישי',
    'wed': 'רביעי',
    'thu': 'חמישי',
    'fri': 'שישי',
    'sat': 'שבת'
  };
  return dayNames[day] || day;
}
