'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant, Supplier, Contact, Product } from '@/schema/types';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Badge, Input, Label, Switch 
} from '@/components/ui';
import { 
  Store, Package, User, Check, ChevronLeft, Clock,
  ArrowRight, Truck, ShoppingCart, 
  Clapperboard,
  RefreshCcw,
  ChevronRight,
  CheckCheck,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { getCategoryBadge } from '@/components/ui/badge';
import { UNITS_DICT } from '@/schema/states';

interface InventorySnapshotFormProps {
  restaurant: Restaurant;
  contact: {
    name: string;
    whatsapp: string;
    role: string;
  };
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  onSelectSupplier: any; // Function to select a supplier
  onSubmitSnapshot: (data: any) => void;
  orderId: string;
  isMidweekOrder: boolean;
  toggleOrderType: () => void;
}

export default function InventorySnapshotForm({
  restaurant,
  contact,
  suppliers,
  selectedSupplier,
  onSelectSupplier,
  onSubmitSnapshot,
  orderId,
  isMidweekOrder,
  toggleOrderType
}: InventorySnapshotFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Load saved form values from localStorage if available
    const savedValues = localStorage.getItem(`inventory_snapshot_${selectedSupplier?.whatsapp}`);
    if (savedValues) {
      setFormValues(JSON.parse(savedValues));
    }
  }, [selectedSupplier]);

  // Handle input change
  const handleChange = (productId: string, value: string) => {
    // Only allow numbers and a single decimal point
    const regex = /^(\d*\.?\d*)$/;
    if (!regex.test(value) && value !== '') return;

    setFormValues(prev => ({ ...prev, [productId]: value }));
    localStorage.setItem(`inventory_snapshot_${selectedSupplier?.whatsapp}`, JSON.stringify({ ...formValues, [productId]: value }));
    // Clear error if value is valid
    if (value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[productId];
        return newErrors;
      });
    } else if (value === '') {
      setFormErrors(prev => ({ ...prev, [productId]: 'נדרש למלא את השדה' }));
    } else {
      setFormErrors(prev => ({ ...prev, [productId]: 'יש להזין מספר חיובי' }));
    }
  };

  // Handle key down for better UX (move to next input on Enter)
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
        // Select the text in the input
        inputRefs.current[nextIndex]?.select();
      }
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = e.key === "ArrowDown" ? index + 1 : index - 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex]?.focus();
        // Select the text in the input
        inputRefs.current[nextIndex]?.select();
      }
    }
    
  };

  // Check if all fields are filled and valid
  useEffect(() => {
    if (!selectedSupplier) {
      setIsFormValid(false);
      return;
    }

    const allProducts = selectedSupplier.products || [];
    const hasAllValues = allProducts.every(product => {
      const productId = product.name; // Using name as ID for simplicity
      return formValues[productId] !== undefined && formValues[productId] !== '';
    });

    const hasNoErrors = Object.keys(formErrors).length === 0;
    
    setIsFormValid(hasAllValues && hasNoErrors);
  }, [formValues, formErrors, selectedSupplier]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !selectedSupplier) return;

    const productData = selectedSupplier.products.map(product => {
      const productId = product.name; // Using name as ID for simplicity
      return {
        ...product,
        currentQty: formValues[productId],
        // Check if today is weekend (Friday or Saturday in Israel)
        midweek: new Date().getDay() !== 5 && new Date().getDay() !== 6
      };
    });

    const snapshotData = {
      orderId,
      restaurantId: restaurant.legalId,
      supplierId: selectedSupplier.whatsapp,
      contact,
      products: productData,
      timestamp: new Date().toISOString()
    };
    // localStorage.removeItem(`inventory_snapshot_${selectedSupplier.whatsapp}`);
    onSubmitSnapshot(snapshotData);
  };

  const handleCompleteMissingProducts = () => {
    // This function can be used to handle missing products
    let formValuesCopy = { ...formValues };
    selectedSupplier?.products.forEach((product, index) => {
      const productId = product.name; // Using name as ID for simplicity
      const productBaseQty = product.parMidweek || product.parWeekend || '0';
      if (!formValues[productId]) {
        // If the product is missing, set a default value or handle it accordingly
        formValuesCopy[productId] = productBaseQty.toString();
        inputRefs.current[index]?.focus();
      }
    });
    setFormValues(formValuesCopy);
    localStorage.setItem(`inventory_snapshot_${selectedSupplier?.whatsapp}`, JSON.stringify(formValuesCopy));
  };

  // If no supplier is selected, show the supplier selection screen
  if (!selectedSupplier) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">ספירת מלאי</CardTitle>
            <CardDescription className="text-center">בחר ספק לביצוע ספירת מלאי והזמנה</CardDescription>

            {/* Add order type selection */}
            <div className="mt-4 flex justify-center items-center gap-4">
              <div 
                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${isMidweekOrder ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                onClick={() => !isMidweekOrder && toggleOrderType()}
              >
                <Sun size={18} />
                <div>
                  <p className="font-medium">אמצע שבוע</p>
                  <p className="text-xs opacity-80">א׳-ד׳</p>
                </div>
              </div>
              
              <div 
                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${!isMidweekOrder ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                onClick={() => isMidweekOrder && toggleOrderType()}
              >
                <Calendar size={18} />
                <div>
                  <p className="font-medium">סוף שבוע</p>
                  <p className="text-xs opacity-80">ה׳-ש׳</p>
                </div>
              </div>
            </div>
            
            {/* Show next delivery information */}
            <div className="mt-2 text-center text-sm text-muted-foreground">
              <p>
                {/* {isMidweekOrder ? 
                  'הזמנת אמצע שבוע - אספקה: מחר בשעה 10:00' : 
                  'הזמנת סוף שבוע - אספקה בשעה 10:00'} */}
              </p>
            </div>
          </CardHeader>
          <CardContent className='grid grid-cols-2 max-sm:grid-cols-1 gap-2'>
            {/* Restaurant info */}
            <div className="border-r border-muted-foreground p-2 mb-6">
              <h3 className="font-semibold mb-2 flex items-center">
                <Store className="ml-2 h-5 w-5" />
                פרטי מסעדה
              </h3>
              <p className="font-medium">{restaurant.name}</p>
              <p className="text-sm text-muted-foreground">{restaurant.legalName}</p>
            </div>
            
            {/* Contact info */}
            <div className=" border-r border-muted-foreground p-2 mb-6">
              <h3 className="font-semibold mb-2 flex items-center">
                <User className="ml-2 h-5 w-5" />
                פרטי מבצע הספירה
              </h3>
              <p className="font-medium">{contact.name}</p>
              <p className="text-sm text-muted-foreground">{contact.whatsapp}</p>
              <p className="text-sm text-muted-foreground">תפקיד: {hebrewRole(contact.role)}</p>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold mb-4 text-center">בחר ספק</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier, index) => (
            <motion.div 
              key={supplier.whatsapp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all p-0"
                onClick={() => onSelectSupplier(supplier)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{supplier.name}</h3>
                      <p className="text-sm text-muted-foreground">{supplier.whatsapp}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {supplier.category.map(cat => (
                      getCategoryBadge(cat)
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex items-center justify-between">
                    <span>{supplier.products.length} מוצרים</span>
                    <Button variant="default" size="sm" className="gap-1">
                      בחר
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {suppliers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">אין ספקים זמינים</h3>
              <p className="text-muted-foreground">לא נמצאו ספקים עבור מסעדה זו</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Selected supplier view with inventory form
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="supplier-form"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit}>
          <Card className="mb-6 p-2 max-sm:p-0">
            <CardHeader>
              <div className="flex items-center mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectSupplier(null)}
                  className="gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  חזרה לרשימת הספקים
                </Button>
                
                {/* Order type indicator and toggle */}
                <div className="mr-auto flex items-center gap-2">
                  <div 
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer ${isMidweekOrder ? 'bg-primary/10' : ''}`}
                    onClick={() => !isMidweekOrder && toggleOrderType()}
                  >
                    <Sun size={16} />
                    <span className="text-sm">אמצע שבוע</span>
                  </div>
                  
                  <div 
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer ${!isMidweekOrder ? 'bg-primary/10' : ''}`}
                    onClick={() => isMidweekOrder && toggleOrderType()}
                  >
                    <Calendar size={16} />
                    <span className="text-sm">סוף שבוע</span>
                  </div>
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold text-center">ספירת מלאי</CardTitle>
              <CardDescription className="text-center mb-2">
                הזן את כמות המלאי הנוכחית של כל מוצר
              </CardDescription>
              
              {/* Add delivery time information */}
              <p className="text-center text-sm mt-1 bg-muted/50 py-1 rounded-md">
                הזמנה עבור {isMidweekOrder ? 'אמצע שבוע' : 'סוף שבוע'}, 
                אספקה מתוכננת - מחר בשעה 10:00
              </p>
            </CardHeader>
            
            <CardContent className='!px-3'>
              {/* Restaurant and supplier info summary */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 p-2 border-r bg-card pr-4 border-muted-foreground">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Store className="ml-2 h-5 w-5" />
                    פרטי מסעדה
                  </h3>
                  <p className="font-medium">{restaurant.name}</p>
                  <p className="text-sm text-muted-foreground">{restaurant.legalName}</p>
                </div>
                
                <div className="flex-1 flex p-2 border-r bg-card pr-4 border-muted-foreground">
                  <div className=' gap-2'>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Truck className="ml-2 h-5 w-5" />
                      ספק
                    </h3>
                    <p className="font-medium">{selectedSupplier.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.whatsapp}</p>
                  </div>
                   <div className="flex items-center* flex-wrap mr-1 items-baseline gap-1">
                        {selectedSupplier.category.map(cat => getCategoryBadge(cat))}
                    </div>
                </div>
                
                <div className="flex-1 p-2 border-r bg-card pr-4 border-muted-foreground">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Clock className="ml-2 h-5 w-5" />
                    מועד הספירה והאספקה
                  </h3>
                  <p className="font-medium">{new Date().toLocaleDateString('he-IL')}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm mt-2 text-primary font-medium">
                    אספקה: מחר בשעה 10:00
                  </p>
                </div>
              </div>

              {/* Products inventory form with par level indicator */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold flex items-center justify-between">
                  <span>רשימת מוצרים</span>
                  <Badge variant={isMidweekOrder ? "default" : "secondary"}>
                    {isMidweekOrder ? 'בסיס אמצע שבוע' : 'בסיס סוף שבוע'}
                  </Badge>
                </h3>
                
                {selectedSupplier.products.length > 0 ? (
                  <>
                  <div className="grid grid-cols-2 max-sm:hidden gap-2">
                    {selectedSupplier.products.map((product, index) => {
                      const productId = product.name; // Using name as ID for simplicity
                      // Show the relevant par level based on midweek/weekend selection
                      const parLevel = isMidweekOrder ? product.parMidweek : product.parWeekend;
                      
                      return (
                        <motion.div
                          key={productId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="h-full p-2 border-r border-muted-foreground pr-4 mx-1 max-sm:mx-0 flex justify-start text-start gap-4 items-center"
                        >
                          <div className="flex-1">
                            <div className="flex text-start justify-start items-center gap-2 font-medium">
                              <span className="text-base">{product.emoji}</span>
                              <span>{product.name}</span>
                            </div>
                            {/* Show par level */}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              בסיס: {parLevel} {UNITS_DICT[product.unit] || product.unit}
                            </div>
                          </div>
                          <div className='flex flex-col gap-1'>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`qty-${index}`} className="whitespace-nowrap max-sm:text-xs">
                              כמות במלאי:
                            </Label>
                            <div className="relative flex gap-1 items-center">
                              <Input
                                dir='ltr'
                                id={`qty-${index}`}
                                ref={(el) => {
                                  inputRefs.current[index] = el;
                                }}
                                name={productId}
                                value={formValues[productId] || ''}
                                onChange={(e) => handleChange(productId, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className={`w-16 h-6 text-center ${formErrors[productId] ? 'border-red-500' : ''}`}
                                autoComplete="off"
                                inputMode="decimal"
                              />
                              <span className="mr-1 mt-2 text-xs text-muted-foreground">
                                {UNITS_DICT[product.unit] || product.unit}
                              </span>
                            </div>
                          </div>
                             {formErrors[productId] && (
                            <p className="text-red-500 text-xs mr-2">{formErrors[productId]}</p>
                          )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                   {/* Mobile view table */}
                   <div className="bg-card hidden max-sm:block rounded-lg shadow-sm overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-3 text-right whitespace-nowrap">מוצר</th>
                          <th className="p-3 text-right whitespace-nowrap">בסיס</th>
                          <th className="p-3 relative items-center flex gap-1 text-right whitespace-nowrap">
                            כמות במלאי
                            <RefreshCcw onClick={() => {setFormValues({}); localStorage.removeItem(`inventory_snapshot_${selectedSupplier?.whatsapp}`);}} width={12} className="text-muted-foreground cursor-pointer" />
                            </th>
                          <th className="p-3 text-right whitespace-nowrap">יחידות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupplier.products?.map((product: any, index: number) => {
                          // Show the relevant par level based on midweek/weekend selection
                          const parLevel = isMidweekOrder ? product.parMidweek : product.parWeekend;
                          
                          return (
                            <motion.tr 
                              key={index} 
                              className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
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
                              <td className="p-3 text-sm">{parLevel}</td>
                              <td className="p-3">
                                <Input
                                  dir='ltr'
                                  id={`qty-${index}`}
                                  ref={(el) => {
                                    inputRefs.current[index] = el;
                                  }}
                                  name={product.name} // Using name as ID for simplicity
                                  value={formValues[product.name] || ''}
                                  onChange={(e) => handleChange(product.name, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(index, e)}
                                  className={`w-20 h-8 text-center ${formErrors[product.name] ? 'border-red-500' : ''}`}
                                  autoComplete="off"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="p-2 text-center text-xs">{UNITS_DICT[product.unit] || product.unit}</td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : (
                  <div className="text-center p-8 bg-muted rounded-lg">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">אין מוצרים</h3>
                    <p className="text-muted-foreground">לא נמצאו מוצרים עבור ספק זה</p>
                  </div>
                )}

                <div className="pt-6 flex max-sm:flex-col gap-2 justify-between items-center">
                  <Button
                  title='השלם פריטים חוסרים בנתוני בסיס'
                    type="button"
                    variant="outline"
                    className='gap-2 max-sm:w-full'
                    onClick={handleCompleteMissingProducts}
                    >
                    <CheckCheck className="h-4 w-4" />
                    השלמת פריטים חוסרים
                  </Button>
                  <Button
                  title="איפוס שדות"
                    type="reset"
                    variant="secondary"
                    className="gap-2 max-sm:hidden"
                    onClick={() => {setFormValues({}); localStorage.removeItem(`inventory_snapshot_${selectedSupplier?.whatsapp}`);}}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    איפוס שדות
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid}
                    className="gap-2 max-sm:w-full"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    ליצירת הזמנה
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to translate role to Hebrew
function hebrewRole(role: string): string {
  const roles: Record<string, string> = {
    'owner': 'בעל/ת המסעדה',
    'manager': 'מנהל/ת',
    'shift': 'אחראי/ת משמרת',
    'general': 'כללי',
    'supplier': 'ספק'
  };
  return roles[role] || role;
}
