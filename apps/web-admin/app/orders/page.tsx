'use client';

import { useState, useMemo } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui';
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, Filter, Clock, CheckCircle, Package, ArrowUp, ArrowDown, 
  ArrowUpDown, PackageOpen, Calendar, Store, User, Truck, X
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import exampleDatabase from '@/schema/example';
import { Order, Restaurant, Supplier, SupplierCategory } from '@/schema/types';

// Types for enhanced order data
interface EnhancedOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  supplierId: string;
  supplierName: string;
  supplierCategory: SupplierCategory[];
  status: 'pending' | 'confirmed' | 'sent' | 'delivered' | 'cancelled';
  midweek: boolean;
  items: Array<{
    name: string;
    unit: string;
    emoji: string;
    qty: number;
  }>;
  shortages: Array<{
    name: string;
    unit: string;
    emoji: string;
    requestedQty: number;
    deliveredQty: number;
  }>;
  totalItems: number;
  totalProducts: number;
  hasShortages: boolean;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  invoiceUrl?: string;
  restaurantNotes?: string;
  supplierNotes?: string;
}

const categoryNames: Record<string, string> = {
  vegetables: 'ירקות',
  fruits: 'פירות',
  fish: 'דגים',
  meats: 'בשר',
  dairy: 'מחלבה',
  alcohol: 'אלכוהול',
  oliveOil: 'שמן זית',
  disposables: 'כלים חד פעמיים',
  desserts: 'קינוחים',
  juices: 'משקאות',
  eggs: 'ביצים',
  general: 'כללי'
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
      // Map over orders from the example data
      return Object.values(data.orders).map(order => {
        // Find the restaurant for this order
        const restaurant = data.restaurants[order.restaurant.legalId];
        
        // Calculate total items and products
        const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
        const totalProducts = order.items.length;
        
        // Check if there are any shortages
        const hasShortages = order.shortages && order.shortages.length > 0;
        
        // Create an enhanced order object with computed properties
        return {
          id: order.id,
          restaurantId: order.restaurant.legalId,
          restaurantName: order.restaurant.name,
          supplierId: order.supplier.whatsapp,
          supplierName: order.supplier.name,
          supplierCategory: order.category, 
          status: order.status,
          midweek: order.midweek,
          items: order.items,
          shortages: order.shortages || [],
          totalItems,
          totalProducts,
          hasShortages,
          createdAt: order.createdAt.toDate(),
          sentAt: order.updatedAt?.toDate(),
          deliveredAt: order.deliveredAt?.toDate(),
          invoiceUrl: order.invoiceUrl,
          restaurantNotes: order.restaurantNotes,
          supplierNotes: order.supplierNotes
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
          order.restaurantName.toLowerCase().includes(searchLower) ||
          order.supplierName.toLowerCase().includes(searchLower);
        
        // Status filter
        const matchesStatus = 
          selectedStatus === 'all' || 
          order.status === selectedStatus;
        
        // Restaurant filter
        const matchesRestaurant = 
          selectedRestaurant === 'all' || 
          order.restaurantId === selectedRestaurant;
        
        // Category filter
        const matchesCategory = 
          selectedCategory === 'all' || 
          order.supplierCategory.includes(selectedCategory as SupplierCategory);
        
        return matchesSearch && matchesStatus && matchesRestaurant && matchesCategory;
      })
      .sort((a, b) => {
        // Sort logic
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'restaurant':
            comparison = a.restaurantName.localeCompare(b.restaurantName);
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
      const uniqueRestaurants = new Set(enhancedOrders.map(o => o.restaurantId));
      const uniqueSuppliers = new Set(enhancedOrders.map(o => o.supplierId));
      
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="w-3 h-3 mr-1" />ממתין</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><CheckCircle className="w-3 h-3 mr-1" />מאושר</Badge>;
      case 'sent':
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><Truck className="w-3 h-3 mr-1" />נשלח</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />נמסר</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />בוטל</Badge>;
      default:
        return <Badge variant="outline">לא ידוע</Badge>;
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 24) {
      return `לפני ${diffHours} שעות`;
    } else if (diffDays === 1) {
      return 'אתמול';
    } else if (diffDays < 7) {
      return `לפני ${diffDays} ימים`;
    } else {
      return format(date, 'dd.MM.yyyy', { locale: he });
    }
  };

  const analyticSection = useMemo(() => ( 
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ הזמנות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            במערכת {stats.uniqueRestaurantsCount} מסעדות
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">בתהליך</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{stats.pending + stats.sent}</div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>ממתינים: {stats.pending}</span>
            <span>נשלחו: {stats.sent}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">הושלמו</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{stats.delivered}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}% מכלל ההזמנות
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">פריטים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgItemsPerOrder}</div>
          <p className="text-xs text-muted-foreground mt-1">
            פריטים בממוצע להזמנה
          </p>
        </CardContent>
      </Card>
    </div>
  ), [stats]);

  const OrderCard = ({ order, index }: { order: EnhancedOrder, index: number }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.supplierName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.restaurantName} • {order.id}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="text-sm flex justify-between">
            <span className="text-muted-foreground">תאריך:</span>
            <span>{getRelativeTime(order.createdAt)}</span>
          </div>
          <div className="text-sm flex justify-between">
            <span className="text-muted-foreground">פריטים:</span>
            <span>{order.totalItems} ({order.totalProducts} מוצרים)</span>
          </div>
          <div className="text-sm flex justify-between">
            <span className="text-muted-foreground">קטגוריה:</span>
            <span>{order.supplierCategory.map(cat => categoryNames[cat] || cat).join(', ')}</span>
          </div>
          {order.hasShortages && (
            <div className="text-sm flex justify-between">
              <span className="text-red-500">חוסרים:</span>
              <span>{order.shortages.length} פריטים</span>
            </div>
          )}
        </div>
        
        <div className="border-t pt-2">
          <Button variant="outline" className="w-full" onClick={() => {
            setSelectedOrder(order);
            setIsDialogOpen(true);
          }}>
            פרטים מלאים
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const OrderTable = ({ orders }: { orders: EnhancedOrder[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">מזהה</TableHead>
            <TableHead className="w-[180px]">
              <div className="flex items-center cursor-pointer" onClick={() => {
                if (sortBy === 'restaurant') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('restaurant');
                  setSortOrder('asc');
                }
              }}>
                מסעדה
                {sortBy === 'restaurant' ? (
                  sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                ) : <ArrowUpDown className="ml-1 h-4 w-4" />}
              </div>
            </TableHead>
            <TableHead className="w-[180px]">ספק</TableHead>
            <TableHead className="w-[100px]">קטגוריה</TableHead>
            <TableHead className="w-[100px]">
              <div className="flex items-center cursor-pointer" onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}>
                תאריך
                {sortBy === 'date' ? (
                  sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                ) : <ArrowUpDown className="ml-1 h-4 w-4" />}
              </div>
            </TableHead>
            <TableHead className="w-[100px]">
              <div className="flex items-center cursor-pointer" onClick={() => {
                if (sortBy === 'items') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('items');
                  setSortOrder('desc');
                }
              }}>
                פריטים
                {sortBy === 'items' ? (
                  sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                ) : <ArrowUpDown className="ml-1 h-4 w-4" />}
              </div>
            </TableHead>
            <TableHead className="w-[120px]">
              <div className="flex items-center cursor-pointer" onClick={() => {
                if (sortBy === 'status') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('status');
                  setSortOrder('asc');
                }
              }}>
                סטטוס
                {sortBy === 'status' ? (
                  sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                ) : <ArrowUpDown className="ml-1 h-4 w-4" />}
              </div>
            </TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
              setSelectedOrder(order);
              setIsDialogOpen(true);
            }}>
              <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}</TableCell>
              <TableCell>
                <div className="font-medium">{order.restaurantName}</div>
              </TableCell>
              <TableCell>{order.supplierName}</TableCell>
              <TableCell>
                {order.supplierCategory.slice(0, 2).map((cat, i) => (
                  <Badge key={i} variant="outline" className="mr-1">
                    {categoryNames[cat] || cat}
                  </Badge>
                ))}
                {order.supplierCategory.length > 2 && <span className="text-xs">+{order.supplierCategory.length - 2}</span>}
              </TableCell>
              <TableCell>{getRelativeTime(order.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Package className="mr-1 h-4 w-4 text-muted-foreground" />
                  <span>{order.totalItems} ({order.totalProducts})</span>
                </div>
                {order.hasShortages && (
                  <div className="flex items-center text-red-500 text-xs mt-1">
                    <X className="mr-1 h-3 w-3" />
                    <span>{order.shortages.length} חוסרים</span>
                  </div>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrder(order);
                  setIsDialogOpen(true);
                }}>
                  פרטים
                </Button>
              </TableCell>
            </TableRow>
          ))}
          
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                לא נמצאו הזמנות
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
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
          <p className="text-muted-foreground">ניהול הזמנות ומעקב אחר סטטוס</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'table' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            טבלה
          </Button>
          <Button 
            variant={viewMode === 'cards' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            כרטיסים
          </Button>
        </div>
      </div>
      
      {/* Analytics Cards */}
      {analyticSection}
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש הזמנות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 pr-10"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="w-40">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{selectedStatus === 'all' ? 'כל הסטטוסים' : 
                    selectedStatus === 'pending' ? 'ממתינים' :
                    selectedStatus === 'sent' ? 'נשלח' :
                    selectedStatus === 'delivered' ? 'נמסר' :
                    selectedStatus === 'confirmed' ? 'מאושר' :
                    selectedStatus === 'cancelled' ? 'בוטל' : 'לא ידוע'
                  }</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתינים</SelectItem>
                <SelectItem value="confirmed">מאושר</SelectItem>
                <SelectItem value="sent">נשלח</SelectItem>
                <SelectItem value="delivered">נמסר</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-40">
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Store className="mr-2 h-4 w-4" />
                  <span>{selectedRestaurant === 'all' ? 'כל המסעדות' : 
                    data.restaurants[selectedRestaurant]?.name || 'לא ידוע'}</span>
                </div>
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
          </div>
          
          <div className="w-40">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  <span>{selectedCategory === 'all' ? 'כל הקטגוריות' : 
                    categoryNames[selectedCategory] || selectedCategory}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(categoryNames).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Orders List */}
      <div className="mt-6">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} />
            ))}
            
            {filteredOrders.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">אין הזמנות</h3>
                <p className="text-muted-foreground">לא נמצאו הזמנות העונות לקריטריוני החיפוש</p>
              </div>
            )}
          </div>
        ) : (
          <OrderTable orders={filteredOrders} />
        )}
      </div>
      
      {/* Order Details Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center justify-between">
                  <span>הזמנה {selectedOrder.id}</span>
                  {getStatusBadge(selectedOrder.status)}
                </DialogTitle>
                <DialogDescription>
                  מ{selectedOrder.restaurantName} אל {selectedOrder.supplierName}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">פרטי הזמנה</TabsTrigger>
                  <TabsTrigger value="products">מוצרים</TabsTrigger>
                  <TabsTrigger value="history">היסטוריה</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">פרטי מסעדה</h3>
                      <div className="rounded-md border p-3">
                        <div className="flex items-center mb-2">
                          <Store className="mr-2 h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{selectedOrder.restaurantName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>מזהה: {selectedOrder.restaurantId}</p>
                          <p>איש קשר: {data.restaurants[selectedOrder.restaurantId]?.contacts[0]?.name || 'לא זמין'}</p>
                          <p>טלפון: {data.restaurants[selectedOrder.restaurantId]?.contacts[0]?.whatsapp || 'לא זמין'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">פרטי ספק</h3>
                      <div className="rounded-md border p-3">
                        <div className="flex items-center mb-2">
                          <Truck className="mr-2 h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{selectedOrder.supplierName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>קטגוריה: {selectedOrder.supplierCategory.map(cat => categoryNames[cat] || cat).join(', ')}</p>
                          <p>טלפון: {selectedOrder.supplierId}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">פרטי הזמנה</h3>
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">תאריך יצירה</p>
                          <p className="font-medium">{format(selectedOrder.createdAt, 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                        </div>
                        
                        {selectedOrder.sentAt && (
                          <div>
                            <p className="text-sm text-muted-foreground">תאריך שליחה</p>
                            <p className="font-medium">{format(selectedOrder.sentAt, 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                          </div>
                        )}
                        
                        {selectedOrder.deliveredAt && (
                          <div>
                            <p className="text-sm text-muted-foreground">תאריך קבלה</p>
                            <p className="font-medium">{format(selectedOrder.deliveredAt, 'dd/MM/yyyy HH:mm', { locale: he })}</p>
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
                
                <TabsContent value="products">
                  <div className="space-y-4">
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
                
                <TabsContent value="history">
                  <div className="space-y-4">
                    <div className="border-r-2 border-gray-200 pr-4 pl-2 py-2 space-y-6">
                      <div className="relative">
                        <div className="absolute -right-[17px] top-0 w-4 h-4 rounded-full bg-green-500 border-4 border-white" />
                        <div className="mr-4">
                          <p className="font-medium">ההזמנה נוצרה</p>
                          <p className="text-sm text-muted-foreground">{format(selectedOrder.createdAt, 'dd/MM/yyyy HH:mm', { locale: he })}</p>
                        </div>
                      </div>
                      
                      {selectedOrder.status !== 'pending' && (
                        <div className="relative">
                          <div className="absolute -right-[17px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white" />
                          <div className="mr-4">
                            <p className="font-medium">ההזמנה נשלחה לספק</p>
                            <p className="text-sm text-muted-foreground">{selectedOrder.sentAt ? 
                              format(selectedOrder.sentAt, 'dd/MM/yyyy HH:mm', { locale: he }) : 
                              'תאריך לא זמין'}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.status === 'delivered' && (
                        <div className="relative">
                          <div className="absolute -right-[17px] top-0 w-4 h-4 rounded-full bg-green-500 border-4 border-white" />
                          <div className="mr-4">
                            <p className="font-medium">ההזמנה התקבלה</p>
                            <p className="text-sm text-muted-foreground">{selectedOrder.deliveredAt ? 
                              format(selectedOrder.deliveredAt, 'dd/MM/yyyy HH:mm', { locale: he }) : 
                              'תאריך לא זמין'}</p>
                            {selectedOrder.hasShortages && (
                              <Badge variant="outline" className="border-red-500 text-red-500 mt-2">
                                התקבל עם {selectedOrder.shortages.length} חוסרים
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
