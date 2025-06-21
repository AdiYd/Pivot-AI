'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  X,
  Filter,
  ArrowUpDown,
  Table as TableIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Timestamp } from 'firebase/firestore';
import { Icon } from '@iconify/react/dist/iconify.js';

// Import the actual database
import exampleDatabase from '@/schema/example';
import { Contact, DataBase, Order, paymentProvider, Restaurant, Supplier, SupplierCategory } from '@/schema/types';
import { getCategoryBadge } from '@/components/ui/badge';
import { DebugButton, debugFunction } from '@/components/debug';
import { useFirebase } from '@/lib/firebaseClient';


declare type Stats = {
    suppliersCount : number,
    productsCount: number,
    totalOrders: number,
    pendingOrders: number,
    deliveredOrders: number,
    recentOrderDate: Date | null,
};

export default function RestaurantsPage() {
  const {database} = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant & { stats: Stats } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'suppliers' | 'orders'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [newRestaurant, setNewRestaurant] = useState<Restaurant>({
    name: '',
    legalName: '',
    legalId: '',
    contacts: [{
      name: '',
      whatsapp: '',
      email: '',
      role: 'owner',
    }],
    payment: {
      provider: 'credit_card',
      status: false
    },
    createdAt: Timestamp.now(),
  } as Restaurant);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const editingRestaurantRef = useRef<Restaurant | null>(null);
  const { toast } = useToast();


  // Validation function for new restaurant
  const validateNewRestaurant = (form: Restaurant): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = 'שם המסעדה נדרש';
    if (!form.legalName.trim()) errors.legalName = 'שם עסקי נדרש';
    if (!form.legalId.trim()) errors.legalId = 'מספר חברה נדרש';
    if (!/^\d{9}$/.test(form.legalId)) errors.legalId = 'מספר חברה חייב להיות 9 ספרות';
    if (!form.contacts[0].name.trim()) errors.contactName = 'שם איש קשר נדרש';
    if (!form.contacts[0].whatsapp.trim()) errors.contactPhone = 'מספר טלפון נדרש';
    if (!/^\+972-?\d{9}$/.test(form.contacts[0].whatsapp.replace(/\s/g, ''))) {
      errors.contactPhone = 'מספר טלפון לא תקין (צריך להתחיל ב +972)';
    }
    if (form.contacts[0].email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contacts[0].email)) {
      errors.contactEmail = 'כתובת אימייל לא תקינה';
    }

    // Check if restaurant already exists
    if (database.restaurants[form.legalId]) {
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

      const newRestaurant : Restaurant = {
        legalId: '',
        legalName:  '',
        name:  '',
        contacts: [{
          whatsapp: '',
          name: '',
          role: 'owner',
          email: undefined
        }],
        payment: {
          provider: 'credit_card',
          status: false // New restaurants start with pending payment
        },
        isActivated: false,
        createdAt: Timestamp.now(),
        suppliers: [],
        orders: [],
      };

      // Update local state (later this will be a Firestore create)
      console.log('Creating new restaurant:', newRestaurant);

      toast({
        title: "מסעדה נוצרה",
        description: `המסעדה "${newRestaurant.name}" נוצרה בהצלחה`,
      });

      // Reset form and close dialog
      setNewRestaurant({
        name: '',
        legalName: '',
        legalId: '',
        contacts: [{
          name: '',
          whatsapp: '',
          email: '',
          role: 'owner',
        }],
        payment: {
          provider: 'credit_card',
          status: false
        },
        createdAt: Timestamp.now(),
      } as Restaurant);
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
      console.log('Updating restaurant:', restaurantId, updatedData);

      // Update selectedRestaurant to reflect changes
      setSelectedRestaurant((prev: Restaurant | null) => ({ ...prev, ...updatedData }));

      toast({
        title: "מסעדה עודכנה",
        description: `פרטי המסעדה ${updatedData.name || 'עודכנו'} בהצלחה`,
      });

      setIsEditing(false);
      editingRestaurantRef.current = null;

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
      console.log('Deleting restaurant:', restaurantId);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state (later this will be a Firestore delete)
      console.log('Deleting restaurant:', restaurantId);
      

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
        title: isActivated ? "מסעדה הופעלה" : "מסעדה מושהית",
        description: `המסעדה ${isActivated ? 'הופעלה' : 'הושהתה'} בהצלחה`,
      });
    } catch (error) {
      console.error('Error toggling activation:', error);
    }
  };

  // Extract restaurants with calculated stats
  const restaurantsWithStats = useMemo(() => {
    try {
      return Object.values(database.restaurants).map(restaurant => {
        // Calculate suppliers count
        const suppliersCount = Object.keys(restaurant.suppliers).length;
        
        // Calculate products count
        let productsCount = 0;
        Object.values(restaurant.suppliers).forEach(supplier => {
          productsCount += Object.keys(supplier.products).length;
        });

        // Calculate orders stats
        const orders = Object.values(restaurant.orders).map(order=>database.orders[order]);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

        // Calculate recent activity
        const recentOrderDate = orders.length > 0 
          ? Math.max(...orders.map(o => o.createdAt.toDate().getTime()))
          : null;

        // Get conversation status
        const conversation = Object.values(database.conversations).find(c => c.restaurantId === restaurant.legalId);

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
  }, [ database]);

  // Filter restaurants based on search term and status filter
  const filteredRestaurants = useMemo(() => {
    return restaurantsWithStats
      .filter(restaurant => {
        // Text search filtering
        const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          restaurant.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          restaurant.legalId.includes(searchTerm) ||
          restaurant.contacts.some(contact => 
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            contact.whatsapp.includes(searchTerm)
          );
        
        // Status filtering
        let matchesStatus = true;
        if (statusFilter === 'active') {
          matchesStatus = restaurant.isActivated && restaurant.payment.status;
        } else if (statusFilter === 'pending') {
          matchesStatus = !restaurant.payment.status;
        } else if (statusFilter === 'inactive') {
          matchesStatus = !restaurant.isActivated;
        }
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sorting logic
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'status':
            // Custom status ordering: active -> pending -> inactive
            const statusOrder = (r: Restaurant) => {
              if (r.isActivated && r.payment.status) return 0;
              if (!r.payment.status) return 1;
              return 2;
            };
            comparison = statusOrder(a) - statusOrder(b);
            break;
          case 'suppliers':
            comparison = a.stats.suppliersCount - b.stats.suppliersCount;
            break;
          case 'orders':
            comparison = a.stats.totalOrders - b.stats.totalOrders;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [restaurantsWithStats, searchTerm, statusFilter, sortBy, sortOrder]);

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

  const getStatusBadge = (restaurant: Restaurant) => {
    if (restaurant.isActivated && restaurant.payment.status) {
      return <Badge variant="default" className="bg-green-500 mx-auto text-nowrap"><CheckCircle className="w-3 h-3 ml-1" />פעיל</Badge>;
    } else if (!restaurant.payment.status) {
      return <Badge className='mx-auto text-nowrap' variant="secondary"><Clock className="w-3 h-3 ml-1" />ממתין לתשלום</Badge>;
    } else {
      return <Badge className='mx-auto text-nowrap' variant="destructive"><XCircle className="w-3 h-3 ml-1" />לא פעיל</Badge>;
    }
  };

  const getRelativeTime = (date: Date | null): string => {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const RestaurantCard = ({ restaurant }: { restaurant: Restaurant & { stats: Stats } }) => (
    <Card key={restaurant.legalId} className="hover:shadow-lg cursor-default transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
              <CardDescription className="text-sm">{restaurant.legalName}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {getStatusBadge(restaurant)}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>ח.פ: {restaurant.legalId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{restaurant.contacts[0].name} - {restaurant.contacts[0].role}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{restaurant.contacts[0].whatsapp}</span>
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
                  editingRestaurantRef.current = { ...restaurant };
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
                  <Button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(restaurant.legalId)}}
                  variant="outline" size="sm" className="text-red-600 hover:text-red-700">
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

  const RestaurantTable = ({ restaurants }: { restaurants: (Restaurant & { stats: Stats })[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'name') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('name');
                    setSortOrder('asc');
                  }
                }}>
                  שם מסעדה
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">איש קשר</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'status') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('status');
                    setSortOrder('asc');
                  }
                }}>
                  סטטוס
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'suppliers') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('suppliers');
                    setSortOrder('desc');
                  }
                }}>
                  ספקים
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'orders') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('orders');
                    setSortOrder('desc');
                  }
                }}>
                  הזמנות
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">פעילות אחרונה</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((restaurant) => (
              <TableRow 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRestaurant(restaurant);
                  setIsDialogOpen(true);
                }}
                key={restaurant.legalId} className="hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-900/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{restaurant.name}</span>
                    <span className="text-xs text-muted-foreground">{restaurant.legalId}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{restaurant.legalName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{restaurant.contacts[0]?.name}</div>
                  <div className="text-xs text-muted-foreground">{restaurant.contacts[0]?.whatsapp}</div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(restaurant)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{restaurant.stats.suppliersCount}</div>
                </TableCell>
                <TableCell>
                  <div className="grid items-center">
                    <span className="font-medium">{restaurant.stats.totalOrders}</span>
                    {restaurant.stats.pendingOrders > 0 && (
                      <span className="text-xs text-amber-500">
                        +{restaurant.stats.pendingOrders} ממתינות
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {restaurant.stats.recentOrderDate ? getRelativeTime(restaurant.stats.recentOrderDate) : 'אין פעילות'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            editingRestaurantRef.current = { ...restaurant };
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
                </TableCell>
              </TableRow>
            ))}
            
            {restaurants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Store className="w-12 h-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">לא נמצאו מסעדות</h3>
                    <p className="text-muted-foreground text-sm">נסה לשנות את הסינון או לחפש מחדש</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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
  }) => {
    // Create a ref to track the input element
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Create a local state to manage the input value
    const [localValue, setLocalValue] = useState(value);
    
    // Update local value when prop changes
    useEffect(() => {
      setLocalValue(value);
    }, [value]);
    
    // Handle changes locally first, then propagate up only when necessary
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const newValue = type === "number" ? Number(e.target.value) : e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={`input-${label}`}>{label}</Label>
        <Input
          id={`input-${label}`}
          ref={inputRef}
          type={type}
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          className={error ? "border-red-500" : ""}
          // Prevent event bubbling to Dialog
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  if (isLoading) {
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
    <div className="p-4 max-sm:p-2 space-y-6">
      <DebugButton debugFunction={debugFunction} />
      {/* Header */}
      <div style={{marginTop:'0px'}} className="flex items-center mt-0 justify-between">
        <div>
          <h1 className="text-3xl font-bold">מסעדות</h1>
          <p className="text-muted-foreground">נהל את כל המסעדות במערכת</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80">תצוגה:</span>
            <div className="flex flex-row-reverse gap-2 items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                title='הצג בכרטיסיות'
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-8 w-8 p-0"
              >
                <Icon icon="mdi:id-card" width="1.5em" height="1.5em" />
              </Button>
              <Button
                title='הצג בטבלה'
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 w-8 p-0"
              >
                <TableIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Add restaurant button (commented out) */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" />
              סה״כ מסעדות
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
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
          <CardContent className='flex-1 overflow-y-auto'>
            <div className='flex gap-2'>
              <div className="text-2xl font-bold text-green-600">{overallStats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">{overallStats.activePercentage}% מהמסעדות</p>
            </div>
            <Progress value={overallStats.activePercentage} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ממתינות לתשלום
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
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
      {(overallStats.pendingPayment > 0 || overallStats.inactive > 0) && false && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="w-5 h-5" />
              דורש תשומת לב
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
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


      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
      
        <div className="relative max-w-md flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם, ח.פ, שם עסקי או איש קשר..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעילות</SelectItem>
              <SelectItem value="pending">ממתינות לתשלום</SelectItem>
              <SelectItem value="inactive">לא פעילות</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Restaurants Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.legalId} restaurant={restaurant} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">לא נמצאו מסעדות</h3>
              <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
            </div>
          )}
        </div>
      ) : (
        <RestaurantTable restaurants={filteredRestaurants} />
      )}

      {/* Restaurant Details Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsEditing(false);
            editingRestaurantRef.current = null;
          }
        }}
      >
        <DialogContent className="max-w-6xl dark:bg-stone-950 flex flex-col max-h-[85vh] min-h-[80vh] overflow-y-auto p-0"
          // Prevent dialog from stealing focus
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
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
                            editingRestaurantRef.current = { ...selectedRestaurant };
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
                          {selectedRestaurant.isActivated ? 'השהה' : 'הפעל'}
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">כללי</TabsTrigger>
                    <TabsTrigger value="contact">איש קשר</TabsTrigger>
                    <TabsTrigger value="suppliers">ספקים</TabsTrigger>
                    <TabsTrigger value="orders">הזמנות</TabsTrigger>
                    {/* <TabsTrigger value="settings">הגדרות</TabsTrigger> */}
                  </TabsList>
                  
                  <TabsContent dir='rtl' value="general" className="space-y-4 mt-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="שם המסעדה"
                            type='text'
                            value={editingRestaurantRef.current?.name || ''}
                            onChange={(value) => editingRestaurantRef.current = { ...editingRestaurantRef.current, name: value as string } as Restaurant }
                          />
                          <EditableField
                            label="ח.פ"
                            type='text'
                            value={editingRestaurantRef.current?.legalId || ''}
                            onChange={(value) => editingRestaurantRef.current = { ...editingRestaurantRef.current, legalId: value as string } as Restaurant }
                            disabled
                          />
                        </div>
                        <EditableField
                          label="שם עסקי מלא"
                          type='text'
                          value={editingRestaurantRef.current?.legalName || ''}
                          onChange={(value) => editingRestaurantRef.current = { ...editingRestaurantRef.current, legalName: value as string } as Restaurant }
                        />
                        
                        <div dir='ltr' className="flex items-center space-x-2">
                          <Switch
                            checked={editingRestaurantRef.current?.isActivated || false}
                            onCheckedChange={(checked) => editingRestaurantRef.current = { ...editingRestaurantRef.current, isActivated: checked } as Restaurant }
                          />
                          <Label>מסעדה פעילה</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              editingRestaurantRef.current = null;
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            ביטול
                          </Button>
                          <Button
                            onClick={() => handleEdit(selectedRestaurant.legalId, editingRestaurantRef.current)}
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
                          <Input value={selectedRestaurant.legalName} readOnly />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                              <div className="text-2xl font-bold">{selectedRestaurant.orders.length}</div>
                              <div className="text-sm text-muted-foreground">הזמנות</div>
                            </CardContent>
                          </Card>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="contact" className="space-y-4 mt-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="שם"
                            value={editingRestaurantRef.current?.contacts[0]?.name || ''}
                            onChange={(value) => editingRestaurantRef.current = {
                              ...editingRestaurantRef.current,
                              contacts: [{ ...editingRestaurantRef.current?.contacts[0], name: value as string }]
                            } as Restaurant}
                          />
                          <div className="space-y-2">
                            <Label>תפקיד</Label>
                            <Select
                              value={editingRestaurantRef.current?.contacts[0]?.role || 'owner'}
                              onValueChange={(value: Contact["role"]) => 
                                editingRestaurantRef.current = {
                                  ...editingRestaurantRef.current,
                                  contacts: [{ ...editingRestaurantRef.current?.contacts[0], role: value }]
                                } as Restaurant
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">בעלים</SelectItem>
                                <SelectItem value="manager">מנהל</SelectItem>
                                <SelectItem value="shift">משמרת</SelectItem>
                                <SelectItem value="general">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <EditableField
                            label="WhatsApp"
                            value={editingRestaurantRef.current?.contacts[0]?.whatsapp || ''}
                            onChange={(value) => editingRestaurantRef.current = {
                              ...editingRestaurantRef.current,
                              contacts: [{ ...editingRestaurantRef.current?.contacts[0], whatsapp: value }]
                            } as Restaurant}
                          />
                          <EditableField
                            label="אימייל"
                            value={editingRestaurantRef.current?.contacts[0]?.email || ''}
                            onChange={(value) => editingRestaurantRef.current = {
                              ...editingRestaurantRef.current,
                              contacts: [{ ...editingRestaurantRef.current?.contacts[0], email: value }]
                            } as Restaurant}
                            type="email"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              editingRestaurantRef.current = null;
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            ביטול
                          </Button>
                          <Button
                            onClick={() => handleEdit(selectedRestaurant.legalId, editingRestaurantRef.current)}
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
                            <Label>שם</Label>
                            <Input value={selectedRestaurant.contacts[0].name} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label>תפקיד</Label>
                            <Input value={selectedRestaurant.contacts[0].role} readOnly />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>WhatsApp</Label>
                            <Input value={selectedRestaurant.contacts[0].whatsapp} readOnly />
                          </div>
                          {selectedRestaurant.contacts[0].email && (
                            <div className="space-y-2">
                              <Label>אימייל</Label>
                              <Input value={selectedRestaurant.contacts[0].email} readOnly />
                            </div>
                          )}
                        </div>
                        
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">פרטי תשלום</h4>
                          <div className="flex justify-start gap-4">
                            <div className="space-y-2 min-w-[60%]">
                              <Label>ספק תשלומים</Label>
                              <Input value={selectedRestaurant.payment.provider} readOnly />
                            </div>
                            <div className="space-y-2 grid ">
                              <Label>סטטוס תשלום</Label>
                              {getStatusBadge(selectedRestaurant)}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent dir='rtl' value="suppliers" className="space-y-4 mt-6">
                    <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4">
                      {Object.values(selectedRestaurant.suppliers).map((supplier: Supplier) => (
                        <Card className='' key={supplier.whatsapp}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex flex-2 items-center gap-2">
                                <Package className="w-5 h-5" />
                                {supplier.name}
                              </div>
                              <div className='flex flex-1 items-center justify-end flex-wrap gap-2'>
                                {supplier.category.map((category: SupplierCategory, i: number) => (<div key={i}>{getCategoryBadge(category)}</div>))}
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className='flex-1 overflow-y-auto'>
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
                              <div className="flex flex-wrap gap-2">
                                {Object.values(supplier.products).map((product: any) => (
                                  <div key={product.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-400/10 cursor-default text-sm">
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

                  <TabsContent dir='rtl' value="orders" className="space-y-4 mt-6">
                    <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4">
                      {Object.values(selectedRestaurant.orders).length > 0 ? (
                        Object.values(selectedRestaurant.orders).map((orderId: string) => {
                          const order = database.orders[orderId] as Order;
                          const supplier = selectedRestaurant.suppliers.find((s) => s.whatsapp === order.supplier.whatsapp);
                          return (
                            <Card className='!min-w-[300px] max-sm:!min-w-fit' key={order.id}>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    #{order.id}
                                  </div>
                                  {/* {getStatusBadge({ ...selectedRestaurant, payment: { provider: selectedRestaurant.payment.provider, status: order.status === 'delivered' } })} */}
                                </CardTitle>
                                <CardDescription>
                                  ספק: {supplier?.name || 'לא זמין'} | {order.createdAt.toDate().toLocaleDateString('he-IL')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className='flex-1 overflow-y-auto'>
                                <div className="space-y-2">
                                  <Label className="text-sm">פריטים</Label>
                                  <div className="space-y-1 list-disc">
                                    {order.items.map((item: any, index: number) => {
                                      return (
                                        <li key={index} className="grid grid-cols-[3fr_1fr] text-sm p-2">
                                          <span >{index+1}. {item?.name || 'מוצר לא זמין'}</span>
                                          <span dir='ltr'>{item.qty} {item?.unit}</span>
                                        </li>
                                      );
                                    })}
                                  </div>
                                  {order.shortages.length > 0 && (
                                    <div className="mt-3">
                                      <Label className="text-sm text-red-600">חוסרים</Label>
                                      <div className="space-y-1">
                                        {order.shortages.map((shortage: any, index: number) => {
                                          return (
                                            <div key={index} className="flex justify-between text-sm p-2 border border-red-200 rounded-lg bg-red-50">
                                              <span>{shortage?.name || 'מוצר לא זמין'}</span>
                                              <span className="text-red-600">הוזמן: {shortage.requestedQty}, התקבל: {shortage.deliveredQty}</span>
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
