'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Order, ItemLine } from '@/lib/types';
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
  ArrowUpDown
} from 'lucide-react';

// Mock data for development
const mockOrders: (Order & { 
  restaurantName: string; 
  supplierName: string; 
  totalItems: number;
  totalAmount?: number;
})[] = [
  {
    id: 'ord-1',
    restaurantName: 'בית קפה הדרך',
    supplierName: 'ירקות השדה',
    supplierId: 'sup-1',
    status: 'delivered',
    items: [
      { productId: 'prod-1', qty: 5 },
      { productId: 'prod-2', qty: 3 },
      { productId: 'prod-3', qty: 2 }
    ],
    totalItems: 3,
    totalAmount: 245.50,
    midweek: true,
    createdAt: new Date('2024-01-15T08:30:00'),
    sentAt: new Date('2024-01-15T16:00:00'),
    receivedAt: new Date('2024-01-16T07:30:00'),
    invoiceUrl: 'https://example.com/invoice-1.pdf',
    shortages: []
  },
  {
    id: 'ord-2',
    restaurantName: 'פיצה רומא',
    supplierName: 'מחלבת הגולן',
    supplierId: 'sup-2',
    status: 'sent',
    items: [
      { productId: 'prod-4', qty: 10 },
      { productId: 'prod-5', qty: 5 }
    ],
    totalItems: 2,
    totalAmount: 180.00,
    midweek: false,
    createdAt: new Date('2024-01-16T10:15:00'),
    sentAt: new Date('2024-01-16T14:00:00'),
    shortages: []
  },
  {
    id: 'ord-3',
    restaurantName: 'סושי יאמה',
    supplierName: 'דגי הים התיכון',
    supplierId: 'sup-3',
    status: 'pending',
    items: [
      { productId: 'prod-6', qty: 2 },
      { productId: 'prod-7', qty: 1 },
      { productId: 'prod-8', qty: 3 }
    ],
    totalItems: 3,
    totalAmount: 320.00,
    midweek: true,
    createdAt: new Date('2024-01-17T09:45:00'),
    shortages: []
  },
  {
    id: 'ord-4',
    restaurantName: 'בית קפה הדרך',
    supplierName: 'בשר טרי',
    supplierId: 'sup-4',
    status: 'delivered',
    items: [
      { productId: 'prod-9', qty: 4 }
    ],
    totalItems: 1,
    totalAmount: 150.00,
    midweek: false,
    createdAt: new Date('2024-01-14T11:20:00'),
    sentAt: new Date('2024-01-14T12:00:00'),
    receivedAt: new Date('2024-01-15T08:00:00'),
    shortages: [
      { productId: 'prod-9', qty: 4, received: 3 }
    ]
  }
];

const mockProducts: Record<string, { name: string; unit: string; emoji: string }> = {
  'prod-1': { name: 'עגבניות', unit: 'kg', emoji: '🍅' },
  'prod-2': { name: 'מלפפונים', unit: 'kg', emoji: '🥒' },
  'prod-3': { name: 'חסה', unit: 'pcs', emoji: '🥬' },
  'prod-4': { name: 'גבינה צהובה', unit: 'kg', emoji: '🧀' },
  'prod-5': { name: 'חלב', unit: 'liter', emoji: '🥛' },
  'prod-6': { name: 'סלמון', unit: 'kg', emoji: '🐟' },
  'prod-7': { name: 'טונה', unit: 'kg', emoji: '🐟' },
  'prod-8': { name: 'אטלנטי', unit: 'kg', emoji: '🐟' },
  'prod-9': { name: 'בשר בקר', unit: 'kg', emoji: '🥩' }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />ממתין</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500"><Truck className="w-3 h-3 ml-1" />נשלח</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />נמסר</Badge>;
      default:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />בעיה</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600';
      case 'sent': return 'text-blue-600';
      case 'delivered': return 'text-green-600';
      default: return 'text-red-600';
    }
  };

  const OrderCard = ({ order }: { order: typeof mockOrders[0] }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">הזמנה #{order.id}</CardTitle>
              <CardDescription>{order.restaurantName} ← {order.supplierName}</CardDescription>
            </div>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{order.createdAt.toLocaleDateString('he-IL')} {order.createdAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {order.sentAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span>נשלח: {order.sentAt.toLocaleDateString('he-IL')} {order.sentAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          {order.receivedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4" />
              <span>נמסר: {order.receivedAt.toLocaleDateString('he-IL')} {order.receivedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{order.totalItems} פריטים</span>
          </div>
          {order.totalAmount && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>₪{order.totalAmount.toFixed(2)}</span>
            </div>
          )}
          {order.shortages.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{order.shortages.length} חסרים</span>
            </div>
          )}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עריכה</p>
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
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">הזמנות</h1>
          <p className="text-muted-foreground">נהל את כל ההזמנות במערכת</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              הזמנה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>צור הזמנה חדשה</DialogTitle>
              <DialogDescription>
                צור הזמנה חדשה עבור מסעדה
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant">מסעדה</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="">בחר מסעדה</option>
                    <option value="rest-1">בית קפה הדרך</option>
                    <option value="rest-2">פיצה רומא</option>
                    <option value="rest-3">סושי יאמה</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">ספק</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="">בחר ספק</option>
                    <option value="sup-1">ירקות השדה</option>
                    <option value="sup-2">מחלבת הגולן</option>
                    <option value="sup-3">דגי הים התיכון</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>פריטים להזמנה</Label>
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">בחר מוצרים וכמויות</p>
                  {/* Add product selection here */}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">ביטול</Button>
              <Button>צור הזמנה</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי מסעדה, ספק או מספר הזמנה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="sent">נשלח</option>
            <option value="delivered">נמסר</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select 
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="p-2 border rounded-md"
          >
            <option value="date-desc">תאריך (חדש→ישן)</option>
            <option value="date-asc">תאריך (ישן→חדש)</option>
            <option value="amount-desc">סכום (גבוה→נמוך)</option>
            <option value="amount-asc">סכום (נמוך→גבוה)</option>
            <option value="status-asc">סטטוס</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ הזמנות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ממתינות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">נשלחו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'sent').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">נמסרו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ ערך</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₪{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  הזמנה #{selectedOrder.id}
                </DialogTitle>
                <DialogDescription>
                  פרטי הזמנה מלאים
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">כללי</TabsTrigger>
                  <TabsTrigger value="items">פריטים</TabsTrigger>
                  <TabsTrigger value="timeline">לוח זמנים</TabsTrigger>
                  <TabsTrigger value="issues">בעיות</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
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
                      <Label>סוג תקופה</Label>
                      <Input value={selectedOrder.midweek ? 'אמצע שבוע' : 'סוף שבוע'} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>סה״כ ערך</Label>
                      <Input value={selectedOrder.totalAmount ? `₪${selectedOrder.totalAmount.toFixed(2)}` : 'לא זמין'} readOnly />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4">
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => {
                      const product = mockProducts[item.productId];
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{product?.emoji || '📦'}</span>
                            <div>
                              <div className="font-medium">{product?.name || `מוצר ${item.productId}`}</div>
                              <div className="text-sm text-muted-foreground">{product?.unit || 'יחידות'}</div>
                            </div>
                          </div>
                          <div className="text-lg font-semibold">
                            {item.qty} {product?.unit || 'יח׳'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="space-y-4">
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
                
                <TabsContent value="issues" className="space-y-4">
                  {selectedOrder.shortages.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-red-600">חסרים בהזמנה:</h4>
                      {selectedOrder.shortages.map((shortage, index) => {
                        const product = mockProducts[shortage.productId];
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border border-red-200 rounded-md bg-red-50 dark:bg-red-950">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              <div>
                                <div className="font-medium">{product?.name || `מוצר ${shortage.productId}`}</div>
                                <div className="text-sm text-muted-foreground">
                                  הוזמן: {shortage.qty} {product?.unit} | נמסר: {shortage.received} {product?.unit}
                                </div>
                              </div>
                            </div>
                            <div className="text-red-600 font-semibold">
                              חסר: {shortage.qty - shortage.received} {product?.unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p>אין בעיות בהזמנה זו</p>
                      <p className="text-sm">כל הפריטים נמסרו במלואם</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
