'use client';

import { useState, useMemo } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Badge, Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger, Tabs, TabsContent, 
  TabsList, TabsTrigger, Label, Skeleton, Tooltip, TooltipContent, 
  TooltipTrigger, Progress, Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui';
import { 
  Search, Filter, Package, ShoppingCart, CheckCircle, Clock, 
  TrendingUp, Truck, Store, X, Eye, ArrowUpDown, 
  Calendar, User, PackageOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Icon } from '@iconify/react/dist/iconify.js';

// Import the actual database
import exampleDatabase from '@/schema/example';
import { Order, OrderStatus, SupplierCategory } from '@/schema/types';
import { getCategoryBadge } from '@/components/ui/badge';
import { OrderSchema } from '@/schema/schemas';
import { CATEGORIES_DICT } from '@/schema/states';
import { DebugButton, debugFunction } from '@/components/debug';
import { debug } from 'console';

// Types for enhanced order data
interface EnhancedOrder extends Order {
  totalItems: number;
  totalProducts: number;
  hasShortages: boolean;
}

// Status dictionary with colors and icons
const STATUS_DICT: Record<OrderStatus, { name: string, variant: string, icon: React.ReactNode }> = {
  pending: { name: 'ממתין', variant: 'outline', icon: <Clock className="w-3 h-3 mr-1" /> },
  confirmed: { name: 'מאושר', variant: 'outline', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  sent: { name: 'נשלח', variant: 'outline', icon: <Truck className="w-3 h-3 mr-1" /> },
  delivered: { name: 'נמסר', variant: 'default', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
  cancelled: { name: 'בוטל', variant: 'destructive', icon: <X className="w-3 h-3 mr-1" /> }
};

export default function OrdersPage() {
  const [data, setData] = useState(exampleDatabase);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<EnhancedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'restaurant' | 'status' | 'items'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { toast } = useToast();

  // Extract and enhance order data from the actual database
  const enhancedOrders = useMemo((): EnhancedOrder[] => {
    try {
      return Object.values(data.orders).map(order => {
        // Calculate total items and products
        order = OrderSchema.parse(order); // Validate order structure
        const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
        const totalProducts = order.items.length;
        
        // Check if there are any shortages
        const hasShortages = order.shortages && order.shortages.length > 0;
        
        return {
          ...order,
          totalItems,
          totalProducts,
          hasShortages,
        };
      });
    } catch (error) {
      console.error('Error processing orders:', error);
      return [];
    }
  }, [data]);

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    return enhancedOrders
      .filter(order => {
        // Text search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          order.id.toLowerCase().includes(searchLower) ||
          order.restaurant.name.toLowerCase().includes(searchLower) ||
          order.supplier.name.toLowerCase().includes(searchLower);
        
        // Status filter
        const matchesStatus = 
          selectedStatus === 'all' || 
          order.status === selectedStatus;
        
        // Restaurant filter
        const matchesRestaurant =
          selectedRestaurant === 'all' ||
          order.restaurant.legalId === selectedRestaurant;
        
        // Category filter
        const matchesCategory = 
          selectedCategory === 'all' || 
          order.category.includes(selectedCategory as SupplierCategory);
        
        return matchesSearch && matchesStatus && matchesRestaurant && matchesCategory;
      })
      .sort((a, b) => {
        // Sort logic
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = a.createdAt?.toDate() - b.createdAt?.toDate();
            break;
          case 'restaurant':
            comparison = a.restaurant.name.localeCompare(b.restaurant.name);
            break;
          case 'status':
            // Custom status ordering: pending -> confirmed -> sent -> delivered -> cancelled
            const statusOrder = { 
              pending: 0, 
              confirmed: 1,
              sent: 2, 
              delivered: 3,
              cancelled: 4
            };
            comparison = 
              (statusOrder[a.status] ?? 999) - 
              (statusOrder[b.status] ?? 999);
            break;
          case 'items':
            comparison = a.totalItems - b.totalItems;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [enhancedOrders, searchTerm, selectedStatus, selectedRestaurant, selectedCategory, sortBy, sortOrder]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    try {
      const total = enhancedOrders.length;
      const pending = enhancedOrders.filter(o => o.status === 'pending').length;
      const sent = enhancedOrders.filter(o => o.status === 'sent').length;
      const delivered = enhancedOrders.filter(o => o.status === 'delivered').length;
      const withShortages = enhancedOrders.filter(o => o.hasShortages).length;
      
      // Get unique restaurants and suppliers
      const uniqueRestaurants = new Set(enhancedOrders.map(o => o.restaurant.legalId));
      const uniqueSuppliers = new Set(enhancedOrders.map(o => o.supplier.whatsapp));

      // Calculate average items per order
      const avgItems = total > 0 ? 
        enhancedOrders.reduce((sum, o) => sum + o.totalItems, 0) / total : 0;
      
      return {
        total,
        pending,
        sent,
        delivered,
        withShortages,
        uniqueRestaurantsCount: uniqueRestaurants.size,
        uniqueSuppliersCount: uniqueSuppliers.size,
        avgItemsPerOrder: Math.round(avgItems * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        withShortages: 0,
        uniqueRestaurantsCount: 0,
        uniqueSuppliersCount: 0,
        avgItemsPerOrder: 0
      };
    }
  }, [enhancedOrders]);

  const getStatusBadge = (status: OrderStatus) => {
    const statusInfo = STATUS_DICT[status];
    let className = '';
    
    switch (status) {
      case 'pending':
        className = 'border-amber-500 text-amber-500';
        break;
      case 'confirmed':
        className = 'border-blue-500 text-blue-500';
        break;
      case 'sent':
        className = 'border-purple-500 text-purple-500';
        break;
      case 'delivered':
        className = 'bg-green-500';
        break;
      default:
        className = 'bg-gray-500';
    }
    
    return (
      <Badge 
        variant={statusInfo.variant as any} 
        className={`${className} flex items-center w-fit gap-1`}
      >
        {statusInfo.icon}
        {statusInfo.name}
      </Badge>
    );
  };

  const getRelativeTime = (date: Date | any): string => {
      if (!date) return 'Never';

      const now = new Date();
      // Convert Firebase Timestamp to JavaScript Date object
      const jsDate = (typeof date === 'object' && 'toDate' in date) ? date?.toDate() : date;
      const diffMs = now.getTime() - jsDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffHours < 24) {
        return `לפני ${diffHours} שעות`;
      } else if (diffDays === 1) {
        return 'אתמול';
      } else if (diffDays < 7) {
        return `לפני ${diffDays} ימים`;
      } else {
        return format(jsDate, 'dd.MM.yyyy', { locale: he });
      }
    };
  // Stats cards section
  const statsSection = (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            סה״כ הזמנות
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          <div className="text-2xl font-bold">{stats.total}</div>
          <Progress value={100} className="mt-2" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            בתהליך
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          <div className="text-2xl font-bold text-amber-500">{stats.pending + stats.sent}</div>
          <p className="text-xs text-muted-foreground mt-1">
            ממתינים: {stats.pending} | נשלחו: {stats.sent}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            הושלמו
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          <div className="text-2xl font-bold text-green-500">{stats.delivered}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}% מכלל ההזמנות
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            פריטים
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          <div className="text-2xl font-bold">{stats.avgItemsPerOrder}</div>
          <p className="text-xs text-muted-foreground mt-1">
            פריטים בממוצע להזמנה
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const OrderCard = ({ order }: { order: EnhancedOrder }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{order.supplier.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                {order.restaurant.name}
              </CardDescription>
            </div>
          </div>
          <div>
            {getStatusBadge(order.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{getRelativeTime(order.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{order.totalItems} פריטים ({order.totalProducts} מוצרים)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="mdi:tag-multiple" className="w-4 h-4" />
            <span>{order.category.map(cat => CATEGORIES_DICT[cat]?.name || cat).join(', ')}</span>
          </div>
          
          {order.hasShortages && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <X className="w-4 h-4" />
              <span>{order.shortages.length} פריטים חסרים</span>
            </div>
          )}

          {/* Quick look at first few items */}
          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2">פריטים:</div>
            <div className="flex flex-wrap gap-1">
              {order.items.slice(0, 3).map((item, idx) => (
                <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                </Badge>
              ))}
              {order.items.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{order.items.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrder(order);
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
          
          <div className="text-xs text-muted-foreground ml-auto flex items-center">
            ID: <span className="font-mono ml-1">{order.id.substring(0, 8)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const OrderTable = ({ orders }: { orders: EnhancedOrder[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] text-right">מזהה</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'restaurant') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('restaurant');
                    setSortOrder('asc');
                  }
                }}>
                  מסעדה
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">ספק</TableHead>
              <TableHead className="text-right">קטגוריה</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'date') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('date');
                    setSortOrder('desc');
                  }
                }}>
                  תאריך
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center cursor-pointer" onClick={() => {
                  if (sortBy === 'items') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('items');
                    setSortOrder('desc');
                  }
                }}>
                  פריטים
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </div>
              </TableHead>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow   
                onClick={() => {
                    setSelectedOrder(order);
                    setIsDialogOpen(true);
                  }} 
                key={order.id} className="hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-900/50">
                <TableCell className="font-mono min-w-[150px] text-xs">{order.id.substring(0, 8)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.restaurant.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{order.supplier.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {order.category.slice(0, 2).map((cat, idx) => (
                      getCategoryBadge(cat)
                    ))}
                    {order.category.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{order.category.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{getRelativeTime(order.createdAt)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span className="font-medium">{order.totalItems}</span>
                    <span className="text-sm text-muted-foreground mr-1">({order.totalProducts})</span>
                  </div>
                    {order.hasShortages && (
                      <span className="text-red-500 text-xs">
                      +{order.shortages.length} חוסרים
                      </span>
                    )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(order.status)}
                </TableCell>
              </TableRow>
            ))}
            
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">לא נמצאו הזמנות</h3>
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
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }


  return (
    <div className="p-6 max-sm:p-2 space-y-6">
      <DebugButton debugFunction={debugFunction} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">הזמנות</h1>
          <p className="text-muted-foreground">ניהול הזמנות ומעקב אחר סטטוס</p>
        </div>
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
              <Icon icon="mdi:table" width="1.5em" height="1.5em" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Analytics Cards */}
      {statsSection}
      
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מסעדה, ספק או מספר הזמנה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="flex flex-wrap  items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתינים</SelectItem>
                <SelectItem value="confirmed">מאושרים</SelectItem>
                <SelectItem value="sent">נשלחו</SelectItem>
                <SelectItem value="delivered">נמסרו</SelectItem>
                <SelectItem value="cancelled">בוטלו</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל המסעדות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המסעדות</SelectItem>
              {Object.values(data.restaurants).map((restaurant) => (
                <SelectItem key={restaurant.legalId} value={restaurant.legalId}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(CATEGORIES_DICT).map(([value, { name }]) => (
                <SelectItem key={value} value={value}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Orders List */}
      <div>
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">לא נמצאו הזמנות</h3>
                <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
              </div>
            )}
          </div>
        ) : (
          <OrderTable orders={filteredOrders} />
        )}
      </div>
      
      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl dark:bg-stone-950 flex flex-col max-h-[85vh] min-h-[80vh] overflow-y-auto p-0">
          {selectedOrder && (
            <>
              <DialogHeader className="p-6 pb-4 pr-16 sticky top-0 bg-background z-10 border-b">
                <div className="flex items-center gap-8">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      הזמנה {selectedOrder.id}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-1 mt-1">
                      <Store className="w-4 h-4" />
                      {selectedOrder.restaurant.name} ➝ {selectedOrder.supplier.name}
                    </DialogDescription>
                  </div>
                  <div>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 left-4 h-8 w-8 p-0 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-md"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">פרטי הזמנה</TabsTrigger>
                    <TabsTrigger value="products">מוצרים</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent dir='rtl' value="details" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium text-sm text-muted-foreground">פרטי מסעדה</h3>
                        <div className="rounded-md border p-3 h-[stretch]">
                          <div className="flex items-center mb-2">
                            <Store className="ml-2 h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{selectedOrder.restaurant.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>מזהה: {selectedOrder.restaurant.legalId}</p>
                            <p>איש קשר: {data.restaurants[selectedOrder.restaurant.legalId]?.contacts[0]?.name || 'לא זמין'}</p>
                            <p>טלפון: {data.restaurants[selectedOrder.restaurant.legalId]?.contacts[0]?.whatsapp || 'לא זמין'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium text-sm text-muted-foreground">פרטי ספק</h3>
                        <div className="rounded-md border p-3 h-[stretch]">
                          <div className="flex items-center mb-2">
                            <Truck className="ml-2 h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{selectedOrder.supplier.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>קטגוריה: {selectedOrder.category.map(cat => CATEGORIES_DICT[cat]?.name || cat).join(', ')}</p>
                            <p>טלפון: {selectedOrder.supplier.whatsapp}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <h3 className="font-medium text-sm text-muted-foreground">פרטי הזמנה</h3>
                      <div className="rounded-md border p-3 h-[stretch] flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">תאריך יצירה</p>
                            <p className="font-medium">{format(selectedOrder.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                          </div>
                          
                          {selectedOrder.deliveredAt && (
                            <div>
                              <p className="text-sm text-muted-foreground">תאריך קבלה</p>
                              <p className="font-medium">{format(selectedOrder.deliveredAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm text-muted-foreground">יום בשבוע</p>
                            <p className="font-medium">{selectedOrder.midweek ? 'אמצע שבוע' : 'סוף שבוע'}</p>
                          </div>
                        </div>
                        
                        {(selectedOrder.restaurantNotes || selectedOrder.supplierNotes) && (
                          <div className="border-t pt-2 mt-2">
                            {selectedOrder.restaurantNotes && (
                              <div className="mb-2">
                                <p className="text-sm text-muted-foreground">הערות המסעדה</p>
                                <p className="text-sm">{selectedOrder.restaurantNotes}</p>
                              </div>
                            )}
                            
                            {selectedOrder.supplierNotes && (
                              <div>
                                <p className="text-sm text-muted-foreground">הערות הספק</p>
                                <p className="text-sm">{selectedOrder.supplierNotes}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedOrder.invoiceUrl && (
                          <div className="border-t pt-2 mt-2">
                            <p className="text-sm text-muted-foreground">חשבונית</p>
                            <a 
                              href={selectedOrder.invoiceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-500 hover:underline"
                            >
                              צפייה בחשבונית
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="products">
                    <div className="space-y-4 mt-6">
                      <div>
                        <h3 className="font-medium mb-2">מוצרים בהזמנה ({selectedOrder.items.length})</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>שם מוצר</TableHead>
                                <TableHead className="w-[80px]">כמות</TableHead>
                                <TableHead className="w-[80px]">יחידה</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedOrder.items.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.emoji}</TableCell>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.qty}</TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      
                      {selectedOrder.hasShortages && (
                        <div>
                          <h3 className="font-medium mb-2 text-red-500">חוסרים ({selectedOrder.shortages.length})</h3>
                          <div className="rounded-md border border-red-200">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]"></TableHead>
                                  <TableHead>שם מוצר</TableHead>
                                  <TableHead className="w-[80px]">מבוקש</TableHead>
                                  <TableHead className="w-[80px]">סופק</TableHead>
                                  <TableHead className="w-[80px]">חסר</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedOrder.shortages.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.emoji}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.requestedQty}</TableCell>
                                    <TableCell>{item.deliveredQty}</TableCell>
                                    <TableCell className="text-red-500 font-medium">{item.requestedQty - item.deliveredQty}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
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
