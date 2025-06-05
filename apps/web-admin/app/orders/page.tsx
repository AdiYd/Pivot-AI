'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getCategoryBadge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Calendar,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  Eye,
  Edit,
  Download,
  AlertTriangle,
  DollarSign,
  Filter,
  ArrowUpDown,
  Store,
  Phone,
  User,
  X,
  TrendingUp,
  BarChart3,
  Grid3X3,
  Table
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import the actual database
import exampleDatabase from '@/schema/example';
import { SupplierCategory } from '@/schema/types';
import { Icon } from '@iconify/react/dist/iconify.js';

// Types for enhanced order data
interface EnhancedOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  supplierId: string;
  supplierName: string;
  supplierCategory: SupplierCategory[];
  status: 'pending' | 'sent' | 'delivered';
  midweek: boolean;
  items: Array<{
    productId: string;
    productName: string;
    productEmoji: string;
    productUnit: string;
    qty: number;
    parMidweek: number;
    parWeekend: number;
  }>;
  shortages: Array<{
    productId: string;
    productName: string;
    productEmoji: string;
    qty: number;
    received: number;
  }>;
  totalItems: number;
  totalProducts: number;
  hasShortages: boolean;
  createdAt: Date;
  sentAt?: Date;
  receivedAt?: Date;
  invoiceUrl?: string;
}


const categoryNames: Record<string, string> = {
  vegetables: 'ירקות',
  fruits: 'פירות',
  fish: 'דגים',
  meat: 'בשר',
  dairy: 'מחלבה',
  alcohol: 'אלכוהול',
  oliveOil: 'שמן זית',
  disposables: 'כלים חד פעמיים',
  dessert: 'קינוחים',
  juices: 'משקאות',
  eggs: 'ביצים',
  bread: 'לחם',
  coffee: 'קפה'
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
      const orders: EnhancedOrder[] = [];

      Object.entries(data.restaurants).forEach(([restaurantId, restaurant]) => {
        Object.entries(restaurant.orders).forEach(([orderId, order]) => {
          const supplier = restaurant.suppliers[order.supplierId];
          if (!supplier) return; // Skip orders with missing suppliers

          // Get enhanced items with product details
          const enhancedItems = order.items.map(item => {
            const product = supplier.products.find(p => p.id === item.productId);
            return {
              productId: item.productId,
              productName: product?.name || 'מוצר לא זמין',
              productEmoji: product?.emoji || '📦',
              productUnit: product?.unit || 'יח׳',
              qty: item.qty,
              parMidweek: product?.parMidweek || 0,
              parWeekend: product?.parWeekend || 0
            };
          });

          // Get enhanced shortages with product details
          const enhancedShortages = order.shortages.map(shortage => {
            const product = supplier.products.find(p => p.id === shortage.productId);
            return {
              productId: shortage.productId,
              productName: product?.name || 'מוצר לא זמין',
              productEmoji: product?.emoji || '📦',
              qty: shortage.qty,
              received: shortage.received
            };
          });

          orders.push({
            id: order.id,
            restaurantId,
            restaurantName: restaurant.name,
            supplierId: order.supplierId,
            supplierName: supplier.name,
            supplierCategory: supplier.category,
            status: order.status,
            midweek: order.midweek,
            items: enhancedItems,
            shortages: enhancedShortages,
            totalItems: order.items.reduce((sum, item) => sum + item.qty, 0),
            totalProducts: order.items.length,
            hasShortages: order.shortages.length > 0,
            createdAt: order.createdAt.toDate(),
            sentAt: order.sentAt?.toDate(),
            receivedAt: order.receivedAt?.toDate(),
            invoiceUrl: order.invoiceUrl
          });
        });
      });

      return orders;
    } catch (error) {
      console.error('Error processing orders:', error);
      return [];
    }
  }, [data]);

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    return enhancedOrders
      .filter(order => {
        const matchesSearch = order.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             order.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
        const matchesRestaurant = selectedRestaurant === 'all' || order.restaurantId === selectedRestaurant;
        const matchesCategory = selectedCategory === 'all' || order.supplierCategory.includes(selectedCategory);
        
        return matchesSearch && matchesStatus && matchesRestaurant && matchesCategory;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'restaurant':
            comparison = a.restaurantName.localeCompare(b.restaurantName);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'items':
            comparison = a.totalItems - b.totalItems;
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
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
      const totalItems = enhancedOrders.reduce((sum, o) => sum + o.totalItems, 0);
      
        // Category distribution
        const categoryStats = enhancedOrders.reduce((acc, order) => {
          // Loop through each category in the supplier's category array
          order.supplierCategory.forEach(category => {
            // Increment the count for this category
            acc[category] = (acc[category] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>);

      // Restaurant activity
      const restaurantStats = enhancedOrders.reduce((acc, order) => {
        if (!acc[order.restaurantId]) {
          acc[order.restaurantId] = {
            name: order.restaurantName,
            orderCount: 0,
            totalItems: 0,
            shortageCount: 0
          };
        }
        acc[order.restaurantId].orderCount++;
        acc[order.restaurantId].totalItems += order.totalItems;
        if (order.hasShortages) acc[order.restaurantId].shortageCount++;
        return acc;
      }, {} as Record<string, any>);

      return {
        total,
        pending,
        sent,
        delivered,
        withShortages,
        totalItems,
        categoryStats,
        restaurantStats,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        shortageRate: total > 0 ? Math.round((withShortages / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        withShortages: 0,
        totalItems: 0,
        categoryStats: {},
        restaurantStats: {},
        deliveryRate: 0,
        shortageRate: 0
      };
    }
  }, [enhancedOrders]);



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-orange-600 border-orange-600"><Clock className="w-3 h-3 ml-1" />ממתין</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Truck className="w-3 h-3 ml-1" />נשלח</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 ml-1" />נמסר</Badge>;
      default:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />בעיה</Badge>;
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'לפני פחות משעה';
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

    const analyticSection = useMemo(() => ( 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              התפלגות לפי קטגוריות
            </CardTitle>
            <CardDescription>
              התפלגות ההזמנות לפי קטגוריות ספקים
            </CardDescription>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="space-y-3">
              {Object.entries(stats.categoryStats)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(category)}
                      <span className="text-sm">{categoryNames[category] || category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(count / stats.total) * 100} 
                        className="w-20" 
                      />
                      <span className="text-sm font-medium w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              פעילות מסעדות
            </CardTitle>
            <CardDescription>
              הזמנות לפי מסעדה
            </CardDescription>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="space-y-3">
              {Object.entries(stats.restaurantStats)
                .sort(([,a], [,b]) => b.orderCount - a.orderCount)
                .slice(0, 5)
                .map(([restaurantId, restaurant]: [string, any]) => (
                  <div key={restaurantId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{restaurant.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{restaurant.totalItems} פריטים</span>
                      <Badge variant="outline" className="text-xs">
                        {restaurant.orderCount} הזמנות
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
  ), [stats]);

  const OrderCard = ({ order, index }: { order: EnhancedOrder, index : number }) => (
    <Card key={index} className="hover:shadow-lg transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">#{order.id}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                {order.restaurantName}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col* gap-2 items-end">
            {getStatusBadge(order.status)}
            {/* {getCategoryBadge(order.supplierCategory)} */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>{order.supplierName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{order.createdAt.toLocaleDateString('he-IL')} {order.createdAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{order.totalItems} פריטים ({order.totalProducts} מוצרים)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{order.midweek ? 'אמצע שבוע' : 'סוף שבוע'}</span>
          </div>
          {order.hasShortages && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{order.shortages.length} חסרים</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {getRelativeTime(order.createdAt)}
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
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
            {order.invoiceUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>הורד חשבונית</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex flex-col* gap-2 items-end">
            {/* {getStatusBadge(order.status)} */}
            {order.supplierCategory.map(category => getCategoryBadge(category))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const OrderTable = ({ orders }: { orders: EnhancedOrder[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full backdrop-blur-lg bg-card/80">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="border-b">
              <th className="text-right p-3 font-medium text-sm">מספר הזמנה</th>
              <th className="text-right p-3 font-medium text-sm">מסעדה</th>
              <th className="text-right p-3 font-medium text-sm">ספק</th>
              <th className="text-right p-3 font-medium text-sm">קטגוריות</th>
              <th className="text-right p-3 font-medium text-sm">סטטוס</th>
              <th className="text-right p-3 font-medium text-sm">פריטים</th>
              <th className="text-right p-3 font-medium text-sm">תקופה</th>
              <th className="text-right p-3 font-medium text-sm">תאריך</th>
              <th className="text-right p-3 font-medium text-sm">חסרים</th>
              <th className="text-right p-3 font-medium text-sm">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="p-3">
                  <div className="font-medium">#{order.id}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* <Store className="w-4 h-4 text-muted-foreground" /> */}
                    <span className="font-medium">{order.restaurantName}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* <Truck className="w-4 h-4 text-muted-foreground" /> */}
                    <span>{order.supplierName}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {order.supplierCategory.slice(0, 2).map(category => getCategoryBadge(category))}
                    {order.supplierCategory.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{order.supplierCategory.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  {getStatusBadge(order.status)}
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    <div className="font-medium text-center">{order.totalItems}</div>
                    {/* <div className="text-muted-foreground">{order.totalProducts} מוצרים</div> */}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs text-nowrap">
                    {order.midweek ? 'אמצע שבוע' : 'סוף שבוע'}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    <div>{order.createdAt.toLocaleDateString('he-IL')}</div>
                    <div className="text-muted-foreground text-xs">
                      {getRelativeTime(order.createdAt)}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {order.hasShortages ? (
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      {/* <span className="text-sm">{order.shortages.length}</span> */}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {/* <span className="text-sm">תקין</span> */}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
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
                    {order.invoiceUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>הורד חשבונית</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 max-sm:p-2 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }



  return (
    <div className="p-6 max-sm:p-2 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">הזמנות</h1>
          <p className="text-muted-foreground">
            נהל את כל ההזמנות במערכת
          </p>
        </div>
      </div>

     

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              סה״כ הזמנות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <Progress value={100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ממתינות
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <Progress value={stats.total > 0 ? (stats.pending / stats.total) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              נשלחו
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <Progress value={stats.total > 0 ? (stats.sent / stats.total) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              נמסרו
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <Progress value={stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        
        {/* <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              סה״כ פריטים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ממוצע {stats.total > 0 ? Math.round(stats.totalItems / stats.total) : 0} להזמנה
            </p>
          </CardContent>
        </Card> */}
        
        {/* <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              עם חסרים
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-red-600">{stats.withShortages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.shortageRate}% מההזמנות
            </p>
          </CardContent>
        </Card> */}
      </div>

      {/* {analyticSection} */}

       {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
         <div className="flex items-center max-sm:hidden gap-2">
          <span className="text-sm opacity-80">תצוגה:</span>
          <div className="flex gap-2 flex-row-reverse items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              title='הצג בכרטיסיות'
              onClick={() => setViewMode('cards')}
              className="h-8 w-8 p-0"
            >
              <Icon icon="mdi:id-card" width="1.5em" height="1.5em" />
              
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              title='הצג בטבלה'
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מסעדה, ספק או מספר הזמנה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center max-sm:flex-row-reverse gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="sent">נשלח</SelectItem>
              <SelectItem value="delivered">נמסר</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="כל המסעדות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המסעדות</SelectItem>
            {Object.entries(data.restaurants).map(([id, restaurant]) => (
              <SelectItem key={id} value={id}>{restaurant.name}</SelectItem>
            ))}
          </SelectContent>
        </Select> */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="כל הקטגוריות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {Object.entries(categoryNames).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center max-sm:flex-row-reverse gap-2">
          {/* <ArrowUpDown className="w-4 h-4 text-muted-foreground" /> */}
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">תאריך (חדש לישן)</SelectItem>
              <SelectItem value="date-asc">תאריך (ישן לחדש)</SelectItem>
              <SelectItem value="restaurant-asc">מסעדה (ת→א)</SelectItem>
              <SelectItem value="restaurant-desc">מסעדה (א→ת)</SelectItem>
              <SelectItem value="status-asc">סטטוס</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80">תצוגה:</span>
          <div className="flex gap-2 flex-row-reverse items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 w-8 p-0"
            >
              <Icon icon="mdi:id-card" width="1.5em" height="1.5em" />
              
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 w-8 p-0"
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* <div className="text-sm text-muted-foreground">
          {filteredOrders.length} מתוך {enhancedOrders.length} הזמנות
        </div> */}
      </div>

      {/* Orders Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, i) => (
              <OrderCard index={i} key={i} order={order} />
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
        <div>
          {filteredOrders.length > 0 ? (
            <OrderTable orders={filteredOrders} />
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">לא נמצאו הזמנות</h3>
              <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0">
          {selectedOrder && (
            <>
              <DialogHeader className="p-6 pb-4 pr-16 sticky top-0 bg-background z-10 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                       #{selectedOrder.id}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Store className="w-4 h-4" />
                      {selectedOrder.restaurantName} ← {selectedOrder.supplierName}
                    </DialogDescription>
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
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">כללי</TabsTrigger>
                    <TabsTrigger value="items">פריטים</TabsTrigger>
                    <TabsTrigger value="timeline">לוח זמנים</TabsTrigger>
                    <TabsTrigger value="issues">בעיות</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent dir="rtl" value="general" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>מסעדה</Label>
                        <Input value={selectedOrder.restaurantName} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>ספק</Label>
                        <Input value={selectedOrder.supplierName} readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>סטטוס</Label>
                        <div className="p-2 border rounded-md">
                          {getStatusBadge(selectedOrder.status)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>קטגוריה</Label>
                        <div className="p-2 border rounded-md">
                          {selectedOrder.supplierCategory.map(category => getCategoryBadge(category))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>תקופה</Label>
                        <Input value={selectedOrder.midweek ? 'אמצע שבוע' : 'סוף שבוע'} readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>סה״כ פריטים</Label>
                        <Input value={selectedOrder.totalItems.toString()} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>מוצרים שונים</Label>
                        <Input value={selectedOrder.totalProducts.toString()} readOnly />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir="rtl" value="items" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">פריטים בהזמנה ({selectedOrder.totalProducts})</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{item.productEmoji}</span>
                                  <div>
                                    <div className="font-medium">{item.productName}</div>
                                    <div className="text-sm text-muted-foreground">יחידה: {item.productUnit}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold">
                                    {item.qty} {item.productUnit}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    יעד: {selectedOrder.midweek ? item.parMidweek : item.parWeekend} {item.productUnit}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir="rtl" value="timeline" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 border rounded-md">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">הזמנה נוצרה</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedOrder.createdAt.toLocaleDateString('he-IL')} {selectedOrder.createdAt.toLocaleTimeString('he-IL')}
                          </div>
                        </div>
                      </div>
                      {selectedOrder.sentAt && (
                        <div className="flex items-center gap-3 p-3 border rounded-md">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">הזמנה נשלחה לספק</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedOrder.sentAt.toLocaleDateString('he-IL')} {selectedOrder.sentAt.toLocaleTimeString('he-IL')}
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedOrder.receivedAt && (
                        <div className="flex items-center gap-3 p-3 border rounded-md">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">הזמנה נמסרה</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedOrder.receivedAt.toLocaleDateString('he-IL')} {selectedOrder.receivedAt.toLocaleTimeString('he-IL')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir="rtl" value="issues" className="space-y-4 mt-6">
                    {selectedOrder.hasShortages ? (
                      <div className="space-y-4">
                        <h4 className="font-medium text-red-600 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          חסרים בהזמנה ({selectedOrder.shortages.length})
                        </h4>
                        <div className="space-y-3">
                          {selectedOrder.shortages.map((shortage, index) => (
                            <Card key={index} className="border-red-200 bg-red-50 dark:bg-red-950/40">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{shortage.productEmoji}</span>
                                    <div>
                                      <div className="font-medium">{shortage.productName}</div>
                                      <div className="text-sm text-red-600">
                                        הוזמן: {shortage.qty} | נמסר: {shortage.received}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-red-600 font-semibold">
                                    חסר: {shortage.qty - shortage.received}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <h3 className="text-lg font-medium mb-2">אין בעיות בהזמנה</h3>
                        <p className="text-sm">כל הפריטים נמסרו במלואם</p>
                      </div>
                    )}
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
