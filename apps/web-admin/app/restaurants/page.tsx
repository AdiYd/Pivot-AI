'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Store, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Settings,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Timestamp } from 'firebase/firestore';

// Import the actual database
import exampleDatabase from '@/schema/example';

// Interface for new restaurant form
interface NewRestaurantForm {
  name: string;
  businessName: string;
  legalId: string;
  yearsActive: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactRole: "Owner" | "Manager" | "Shift" | "Other";
  paymentProvider: "Stripe" | "Paylink";
}

export default function RestaurantsPage() {
  const [data, setData] = useState(exampleDatabase);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState<NewRestaurantForm>({
    name: '',
    businessName: '',
    legalId: '',
    yearsActive: 1,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactRole: 'Owner',
    paymentProvider: 'Stripe'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Validation function for new restaurant
  const validateNewRestaurant = (form: NewRestaurantForm): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = 'שם המסעדה נדרש';
    if (!form.businessName.trim()) errors.businessName = 'שם עסקי נדרש';
    if (!form.legalId.trim()) errors.legalId = 'מספר חברה נדרש';
    if (!/^\d{9}$/.test(form.legalId)) errors.legalId = 'מספר חברה חייב להיות 9 ספרות';
    if (form.yearsActive < 0 || form.yearsActive > 100) errors.yearsActive = 'שנות פעילות חייבות להיות בין 0-100';
    if (!form.contactName.trim()) errors.contactName = 'שם איש קשר נדרש';
    if (!form.contactPhone.trim()) errors.contactPhone = 'מספר טלפון נדרש';
    if (!/^\+972-?\d{9}$/.test(form.contactPhone.replace(/\s/g, ''))) {
      errors.contactPhone = 'מספר טלפון לא תקין (צריך להתחיל ב +972)';
    }
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      errors.contactEmail = 'כתובת אימייל לא תקינה';
    }

    // Check if restaurant already exists
    if (data.restaurants[form.legalId]) {
      errors.legalId = 'מסעדה עם מספר חברה זה כבר קיימת';
    }

    return errors;
  };

  // Handle new restaurant creation
  const handleCreateRestaurant = async () => {
    const errors = validateNewRestaurant(newRestaurant);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: "שגיאות בטופס",
        description: "אנא תקן את השגיאות ונסה שוב",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRestaurantData = {
        legalId: newRestaurant.legalId,
        businessName: newRestaurant.businessName,
        name: newRestaurant.name,
        primaryContact: {
          whatsapp: newRestaurant.contactPhone,
          name: newRestaurant.contactName,
          role: newRestaurant.contactRole,
          email: newRestaurant.contactEmail || undefined
        },
        yearsActive: newRestaurant.yearsActive,
        payment: {
          provider: newRestaurant.paymentProvider,
          customerId: `${newRestaurant.paymentProvider.toLowerCase()}_${Date.now()}`,
          status: false // New restaurants start with pending payment
        },
        isActivated: false,
        settings: {
          timezone: "Asia/Jerusalem",
          locale: "he-IL"
        },
        createdAt: Timestamp.now(),
        suppliers: {},
        orders: {},
        inventorySnapshots: {}
      };

      // Update local state (later this will be a Firestore create)
      setData(prevData => ({
        ...prevData,
        restaurants: {
          ...prevData.restaurants,
          [newRestaurant.legalId]: newRestaurantData
        }
      }));

      toast({
        title: "מסעדה נוצרה",
        description: `המסעדה "${newRestaurant.name}" נוצרה בהצלחה`,
      });

      // Reset form and close dialog
      setNewRestaurant({
        name: '',
        businessName: '',
        legalId: '',
        yearsActive: 1,
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        contactRole: 'Owner',
        paymentProvider: 'Stripe'
      });
      setFormErrors({});
      setIsCreateDialogOpen(false);

    } catch (error) {
      console.error('Error creating restaurant:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המסעדה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle restaurant edit with proper typing
  const handleEdit = async (restaurantId: string, updatedData: any) => {
    try {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state (later this will be a Firestore update)
      setData(prevData => ({
        ...prevData,
        restaurants: {
          ...prevData.restaurants,
          [restaurantId]: {
            ...prevData.restaurants[restaurantId],
            ...updatedData
          }
        }
      }));

      // Update selectedRestaurant to reflect changes
      setSelectedRestaurant((prev: any) => ({ ...prev, ...updatedData }));

      toast({
        title: "מסעדה עודכנה",
        description: `פרטי המסעדה ${updatedData.name || 'עודכנו'} בהצלחה`,
      });

      setIsEditing(false);
      setEditingRestaurant(null);
      
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון המסעדה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle restaurant delete
  const handleDelete = async (restaurantId: string) => {
    try {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state (later this will be a Firestore delete)
      setData(prevData => {
        const newRestaurants = { ...prevData.restaurants };
        delete newRestaurants[restaurantId];
        
        // Also remove related conversations
        const newConversations = Object.fromEntries(
          Object.entries(prevData.conversations).filter(
            ([phone, conv]) => conv.restaurantId !== restaurantId
          )
        );
        
        return {
          ...prevData,
          restaurants: newRestaurants,
          conversations: newConversations
        };
      });

      toast({
        title: "מסעדה נמחקה",
        description: "המסעדה נמחקה בהצלחה מהמערכת",
      });

      if (selectedRestaurant?.legalId === restaurantId) {
        setIsDialogOpen(false);
        setSelectedRestaurant(null);
      }
      
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המסעדה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle activation toggle
  const handleToggleActivation = async (restaurantId: string, isActivated: boolean) => {
    try {
      await handleEdit(restaurantId, { isActivated });
      
      toast({
        title: isActivated ? "מסעדה הופעלה" : "מסעדה בוטלה",
        description: `המסעדה ${isActivated ? 'הופעלה' : 'בוטלה'} בהצלחה`,
      });
    } catch (error) {
      console.error('Error toggling activation:', error);
    }
  };

  // Extract restaurants with calculated stats
  const restaurantsWithStats = useMemo(() => {
    try {
      return Object.values(data.restaurants).map(restaurant => {
        // Calculate suppliers count
        const suppliersCount = Object.keys(restaurant.suppliers).length;
        
        // Calculate products count
        let productsCount = 0;
        Object.values(restaurant.suppliers).forEach(supplier => {
          productsCount += Object.keys(supplier.products).length;
        });

        // Calculate orders stats
        const orders = Object.values(restaurant.orders);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

        // Calculate recent activity
        const recentOrderDate = orders.length > 0 
          ? Math.max(...orders.map(o => o.createdAt.toDate().getTime()))
          : null;

        // Get conversation status
        const conversation = Object.values(data.conversations).find(c => c.restaurantId === restaurant.legalId);

        return {
          ...restaurant,
          stats: {
            suppliersCount,
            productsCount,
            totalOrders,
            pendingOrders,
            deliveredOrders,
            recentOrderDate: recentOrderDate ? new Date(recentOrderDate) : null,
            conversationState: conversation?.currentState || 'IDLE'
          }
        };
      });
    } catch (error) {
      console.error('Error processing restaurants:', error);
      return [];
    }
  }, [data]);

  // Filter restaurants based on search term
  const filteredRestaurants = restaurantsWithStats.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.legalId.includes(searchTerm)
  );

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total = restaurantsWithStats.length;
    const active = restaurantsWithStats.filter(r => r.isActivated).length;
    const pendingPayment = restaurantsWithStats.filter(r => !r.payment.status).length;
    const totalSuppliers = restaurantsWithStats.reduce((sum, r) => sum + r.stats.suppliersCount, 0);
    const totalProducts = restaurantsWithStats.reduce((sum, r) => sum + r.stats.productsCount, 0);
    const totalOrders = restaurantsWithStats.reduce((sum, r) => sum + r.stats.totalOrders, 0);

    return {
      total,
      active,
      pendingPayment,
      inactive: total - active,
      totalSuppliers,
      totalProducts,
      totalOrders,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }, [restaurantsWithStats]);

  const getStatusBadge = (restaurant: any) => {
    if (restaurant.isActivated && restaurant.payment.status) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />פעיל</Badge>;
    } else if (!restaurant.payment.status) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />ממתין לתשלום</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />לא פעיל</Badge>;
    }
  };

  const getConversationBadge = (state: string) => {
    switch (state) {
      case 'IDLE':
        return <Badge variant="outline" className="text-gray-600 flex justify-center">רגיל</Badge>;
      case 'INVENTORY_SNAPSHOT_PRODUCT':
        return <Badge variant="outline" className="text-blue-600 flex justify-center">בודק מלאי</Badge>;
      case 'ONBOARDING_PAYMENT_METHOD':
        return <Badge variant="outline" className="text-orange-600 flex justify-center">רישום</Badge>;
      default:
        return <Badge variant="outline" className="text-purple-600 flex justify-center">פעיל</Badge>;
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const RestaurantCard = ({ restaurant }: { restaurant: any }) => (
    <Card className="hover:shadow-lg transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
              <CardDescription className="text-sm">{restaurant.businessName}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {getStatusBadge(restaurant)}
            {getConversationBadge(restaurant.stats.conversationState)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>ח.פ: {restaurant.legalId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{restaurant.yearsActive} שנות פעילות</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{restaurant.primaryContact.name} - {restaurant.primaryContact.role}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{restaurant.primaryContact.whatsapp}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span>{restaurant.payment.provider}</span>
          </div>

          {/* Quick Stats */}
          <div className="border-t pt-3 mt-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{restaurant.stats.suppliersCount}</div>
                <div className="text-muted-foreground">ספקים</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{restaurant.stats.productsCount}</div>
                <div className="text-muted-foreground">מוצרים</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{restaurant.stats.totalOrders}</div>
                <div className="text-muted-foreground">הזמנות</div>
              </div>
            </div>
           
          </div>
        </div>
        <div className='flex justify-between items-center mt-4'>
        <div className="flex gap-2 ">
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRestaurant(restaurant);
                  setIsDialogOpen(true);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>צפייה בפרטים</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEditingRestaurant({ ...restaurant });
                  setIsEditing(true);
                  setSelectedRestaurant(restaurant);
                  setIsDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עריכה</p>
            </TooltipContent>
          </Tooltip>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>מחיקה</p>
                </TooltipContent>
              </Tooltip>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                <AlertDialogDescription>
                  פעולה זו תמחק את המסעדה &quot;{restaurant.name}&quot; לצמיתות.
                  כל הנתונים הקשורים כולל ספקים, מוצרים והזמנות יימחקו.
                  פעולה זו לא ניתנת לביטול.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(restaurant.legalId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  מחק מסעדה
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
          {restaurant.stats.recentOrderDate && (
              <div className="text-xs max-sm:hidden block text-muted-foreground mt-2 text-center">
                הזמנה אחרונה: {getRelativeTime(restaurant.stats.recentOrderDate)}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  // Enhanced Edit form component with better UX
  const EditableField = ({ 
    label, 
    value, 
    onChange, 
    type = "text",
    disabled = false,
    error
  }: {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: string;
    disabled?: boolean;
    error?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        disabled={disabled}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  if (isLoading && !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">מסעדות</h1>
          <p className="text-muted-foreground">נהל את כל המסעדות במערכת ({overallStats.total} מסעדות)</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              הוסף מסעדה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>הוסף מסעדה חדשה</DialogTitle>
              <DialogDescription>
                הזן את פרטי המסעדה החדשה
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="שם המסעדה"
                  value={newRestaurant.name}
                  onChange={(value) => setNewRestaurant(prev => ({ ...prev, name: value as string }))}
                  error={formErrors.name}
                />
                <EditableField
                  label="מספר חברה"
                  value={newRestaurant.legalId}
                  onChange={(value) => setNewRestaurant(prev => ({ ...prev, legalId: value as string }))}
                  error={formErrors.legalId}
                />
              </div>
              <EditableField
                label="שם עסקי מלא"
                value={newRestaurant.businessName}
                onChange={(value) => setNewRestaurant(prev => ({ ...prev, businessName: value as string }))}
                error={formErrors.businessName}
              />
              <EditableField
                label="שנות פעילות"
                value={newRestaurant.yearsActive}
                onChange={(value) => setNewRestaurant(prev => ({ ...prev, yearsActive: value as number }))}
                type="number"
                error={formErrors.yearsActive}
              />
              <EditableField
                label="איש קשר ראשי"
                value={newRestaurant.contactName}
                onChange={(value) => setNewRestaurant(prev => ({ ...prev, contactName: value as string }))}
                error={formErrors.contactName}
              />
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="WhatsApp"
                  value={newRestaurant.contactPhone}
                  onChange={(value) => setNewRestaurant(prev => ({ ...prev, contactPhone: value as string }))}
                  error={formErrors.contactPhone}
                />
                <EditableField
                  label="אימייל (אופציונלי)"
                  value={newRestaurant.contactEmail}
                  onChange={(value) => setNewRestaurant(prev => ({ ...prev, contactEmail: value as string }))}
                  type="email"
                  error={formErrors.contactEmail}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תפקיד איש קשר</Label>
                  <Select
                    value={newRestaurant.contactRole}
                    onValueChange={(value: "Owner" | "Manager" | "Shift" | "Other") => 
                      setNewRestaurant(prev => ({ ...prev, contactRole: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">בעלים</SelectItem>
                      <SelectItem value="Manager">מנהל</SelectItem>
                      <SelectItem value="Shift">משמרת</SelectItem>
                      <SelectItem value="Other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ספק תשלומים</Label>
                  <Select
                    value={newRestaurant.paymentProvider}
                    onValueChange={(value: "Stripe" | "Paylink") => 
                      setNewRestaurant(prev => ({ ...prev, paymentProvider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="Paylink">Paylink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewRestaurant({
                    name: '',
                    businessName: '',
                    legalId: '',
                    yearsActive: 1,
                    contactName: '',
                    contactPhone: '',
                    contactEmail: '',
                    contactRole: 'Owner',
                    paymentProvider: 'Stripe'
                  });
                  setFormErrors({});
                }}
              >
                ביטול
              </Button>
              <Button onClick={handleCreateRestaurant} disabled={isLoading}>
                {isLoading ? 'יוצר...' : 'צור מסעדה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם, ח.פ או שם עסקי..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" />
              סה״כ מסעדות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
            <Progress value={100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              מסעדות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.active}</div>
            <Progress value={overallStats.activePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{overallStats.activePercentage}% מהמסעדות</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ממתינות לתשלום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overallStats.pendingPayment}</div>
            <Progress value={(overallStats.pendingPayment / overallStats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              ספקים במערכת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">{overallStats.totalProducts} מוצרים סה״כ</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(overallStats.pendingPayment > 0 || overallStats.inactive > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="w-5 h-5" />
              דורש תשומת לב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overallStats.pendingPayment > 0 && (
                <p className="text-sm">
                  <strong>{overallStats.pendingPayment}</strong> מסעדות ממתינות להשלמת תהליך התשלום
                </p>
              )}
              {overallStats.inactive > 0 && (
                <p className="text-sm">
                  <strong>{overallStats.inactive}</strong> מסעדות לא פעילות
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.legalId} restaurant={restaurant} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">לא נמצאו מסעדות</h3>
            <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או הוסף מסעדה חדשה</p>
          </div>
        )}
      </div>

      {/* Enhanced Restaurant Details Dialog with Better UX */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsEditing(false);
            setEditingRestaurant(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0">
          {selectedRestaurant && (
            <>
              <DialogHeader className="p-6 pb-0 sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {isEditing ? 'עריכת מסעדה' : selectedRestaurant.name}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRestaurant({ ...selectedRestaurant });
                            setIsEditing(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          עריכה
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActivation(selectedRestaurant.legalId, !selectedRestaurant.isActivated)}
                        >
                          {selectedRestaurant.isActivated ? 'בטל הפעלה' : 'הפעל'}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <DialogDescription>
                  {isEditing ? 'ערוך את פרטי המסעדה' : 'פרטי מסעדה מלאים ונתונים מהמערכת'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">כללי</TabsTrigger>
                    <TabsTrigger value="contact">איש קשר</TabsTrigger>
                    <TabsTrigger value="suppliers">ספקים</TabsTrigger>
                    <TabsTrigger value="orders">הזמנות</TabsTrigger>
                    <TabsTrigger value="settings">הגדרות</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-4 mt-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="שם המסעדה"
                            value={editingRestaurant?.name || ''}
                            onChange={(value) => setEditingRestaurant((prev: any) => ({ ...prev, name: value }))
                          }
                          />
                          <EditableField
                            label="ח.פ"
                            value={editingRestaurant?.legalId || ''}
                            onChange={(value) => setEditingRestaurant((prev: any) => ({ ...prev, legalId: value }))
                            }
                            disabled
                          />
                        </div>
                        <EditableField
                          label="שם עסקי מלא"
                          value={editingRestaurant?.businessName || ''}
                          onChange={(value) => setEditingRestaurant((prev: any) => ({ ...prev, businessName: value }))
                          }
                        />
                        <EditableField
                          label="שנות פעילות"
                          value={editingRestaurant?.yearsActive || 0}
                          onChange={(value) => setEditingRestaurant((prev: any) => ({ ...prev, yearsActive: value }))
                          }
                          type="number"
                        />
                        
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={editingRestaurant?.isActivated || false}
                            onCheckedChange={(checked) => setEditingRestaurant((prev: any) => ({ ...prev, isActivated: checked }))
                            }
                          />
                          <Label>מסעדה פעילה</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setEditingRestaurant(null);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            ביטול
                          </Button>
                          <Button
                            onClick={() => handleEdit(selectedRestaurant.legalId, editingRestaurant)}
                            disabled={isLoading}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            שמור שינויים
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>שם המסעדה</Label>
                            <Input value={selectedRestaurant.name} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label>ח.פ</Label>
                            <Input value={selectedRestaurant.legalId} readOnly />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>שם עסקי מלא</Label>
                          <Input value={selectedRestaurant.businessName} readOnly />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>שנות פעילות</Label>
                            <Input value={selectedRestaurant.yearsActive.toString()} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label>תאריך הצטרפות</Label>
                            <Input value={selectedRestaurant.createdAt.toDate().toLocaleDateString('he-IL')} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label>סטטוס</Label>
                            <div className="pt-2">
                              {getStatusBadge(selectedRestaurant)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold">{selectedRestaurant.stats.suppliersCount}</div>
                              <div className="text-sm text-muted-foreground">ספקים</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold">{selectedRestaurant.stats.productsCount}</div>
                              <div className="text-sm text-muted-foreground">מוצרים</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold">{selectedRestaurant.stats.totalOrders}</div>
                              <div className="text-sm text-muted-foreground">הזמנות</div>
                            </CardContent>
                          </Card>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4 mt-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="שם"
                            value={editingRestaurant?.primaryContact?.name || ''}
                            onChange={(value) => setEditingRestaurant((prev: any) => ({
                              ...prev, 
                              primaryContact: { ...prev.primaryContact, name: value }
                            }))
                          }
                          />
                          <div className="space-y-2">
                            <Label>תפקיד</Label>
                            <Select
                              value={editingRestaurant?.primaryContact?.role || 'Owner'}
                              onValueChange={(value: "Owner" | "Manager" | "Shift" | "Other") => 
                                setEditingRestaurant((prev: any) => ({
                                  ...prev, 
                                  primaryContact: { ...prev.primaryContact, role: value }
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Owner">בעלים</SelectItem>
                                <SelectItem value="Manager">מנהל</SelectItem>
                                <SelectItem value="Shift">משמרת</SelectItem>
                                <SelectItem value="Other">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="WhatsApp"
                            value={editingRestaurant?.primaryContact?.whatsapp || ''}
                            onChange={(value) => setEditingRestaurant((prev: any) => ({
                              ...prev, 
                              primaryContact: { ...prev.primaryContact, whatsapp: value }
                            }))
                          }
                          />
                          <EditableField
                            label="אימייל"
                            value={editingRestaurant?.primaryContact?.email || ''}
                            onChange={(value) => setEditingRestaurant((prev: any) => ({
                              ...prev, 
                              primaryContact: { ...prev.primaryContact, email: value }
                            }))
                            }
                            type="email"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>שם</Label>
                            <Input value={selectedRestaurant.primaryContact.name} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label>תפקיד</Label>
                            <Input value={selectedRestaurant.primaryContact.role} readOnly />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>WhatsApp</Label>
                            <Input value={selectedRestaurant.primaryContact.whatsapp} readOnly />
                          </div>
                          {selectedRestaurant.primaryContact.email && (
                            <div className="space-y-2">
                              <Label>אימייל</Label>
                              <Input value={selectedRestaurant.primaryContact.email} readOnly />
                            </div>
                          )}
                        </div>
                        
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">פרטי תשלום</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>ספק תשלומים</Label>
                              <Input value={selectedRestaurant.payment.provider} readOnly />
                            </div>
                            <div className="space-y-2">
                              <Label>מזהה לקוח</Label>
                              <Input value={selectedRestaurant.payment.customerId} readOnly />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="suppliers" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      {Object.values(selectedRestaurant.suppliers).map((supplier: any) => (
                        <Card key={supplier.whatsapp}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                {supplier.name}
                              </div>
                              <Badge variant="outline">{supplier.category}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label className="text-sm">WhatsApp</Label>
                                <div className="text-sm">{supplier.whatsapp}</div>
                              </div>
                              <div>
                                <Label className="text-sm">דירוג</Label>
                                <div className="text-sm">{'⭐'.repeat(supplier.rating)}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">מוצרים ({Object.keys(supplier.products).length})</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.values(supplier.products).map((product: any) => (
                                  <div key={product.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                                    <span>{product.emoji}</span>
                                    <span>{product.name}</span>
                                    <Badge variant="outline" className="text-xs">{product.unit}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="orders" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      {Object.values(selectedRestaurant.orders).length > 0 ? (
                        Object.values(selectedRestaurant.orders).map((order: any) => {
                          const supplier = selectedRestaurant.suppliers[order.supplierId];
                          return (
                            <Card key={order.id}>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    הזמנה #{order.id}
                                  </div>
                                  {getStatusBadge({ ...order, isActivated: true, payment: { status: order.status === 'delivered' } })}
                                </CardTitle>
                                <CardDescription>
                                  ספק: {supplier?.name || 'לא זמין'} | {order.createdAt.toDate().toLocaleDateString('he-IL')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <Label className="text-sm">פריטים</Label>
                                  <div className="space-y-1">
                                    {order.items.map((item: any, index: number) => {
                                      const product = supplier?.products[item.productId];
                                      return (
                                        <div key={index} className="flex justify-between text-sm p-2 border rounded">
                                          <span>{product?.name || 'מוצר לא זמין'}</span>
                                          <span>{item.qty} {product?.unit}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {order.shortages.length > 0 && (
                                    <div className="mt-3">
                                      <Label className="text-sm text-red-600">מחסורים</Label>
                                      <div className="space-y-1">
                                        {order.shortages.map((shortage: any, index: number) => {
                                          const product = supplier?.products[shortage.productId];
                                          return (
                                            <div key={index} className="flex justify-between text-sm p-2 border border-red-200 rounded bg-red-50">
                                              <span>{product?.name || 'מוצר לא זמין'}</span>
                                              <span className="text-red-600">הוזמן: {shortage.qty}, התקבל: {shortage.received}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">אין הזמנות</h3>
                          <p className="text-muted-foreground">המסעדה עדיין לא ביצעה הזמנות</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>אזור זמן</Label>
                        <Input value={selectedRestaurant.settings.timezone} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>שפה ואזור</Label>
                        <Input value={selectedRestaurant.settings.locale} readOnly />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={selectedRestaurant.isActivated} disabled />
                      <Label>מסעדה פעילה</Label>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
