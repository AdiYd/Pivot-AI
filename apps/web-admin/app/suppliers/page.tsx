'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Truck, 
  Calendar,
  Clock,
  Phone,
  Star,
  Package,
  Edit,
  Trash2,
  Eye,
  Store,
  Filter,
  TrendingUp,
  X,
  Grid3X3,
  Table
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import the actual database
import exampleDatabase from '@/schema/example';
import { Product, SupplierCategory } from '@/schema/types';
import { getCategoryBadge } from '@/components/ui/badge';
import { Icon } from '@iconify/react/dist/iconify.js';

// Types for enhanced supplier data
interface EnhancedSupplier {
  id: string;
  whatsapp: string;
  name: string;
  category: SupplierCategory[];
  deliveryDays: number[];
  cutoffHour: number;
  rating?: number;
  restaurantId: string;
  restaurantName: string;
  productCount: number;
  products: Product[];
  recentOrdersCount: number;
  createdAt: Date;
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

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function SuppliersPage() {
  const [data, setData] = useState(exampleDatabase);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { toast } = useToast();

  // Extract and enhance supplier data from the actual database
  const enhancedSuppliers = useMemo((): EnhancedSupplier[] => {
    try {
      const suppliers: EnhancedSupplier[] = [];

      Object.entries(data.restaurants).forEach(([restaurantId, restaurant]) => {
        Object.entries(restaurant.suppliers).forEach(([supplierWhatsapp, supplier]) => {
          // Get products for this supplier
          const products = supplier.products.map(product => ({
            id: product.id,
            supplierId: supplierWhatsapp,
            category: product.category,
            name: product.name,
            emoji: product.emoji,
            unit: product.unit,
            parMidweek: product.parMidweek,
            parWeekend: product.parWeekend,
            createdAt: product.createdAt

          }));

          // Count recent orders for this supplier
          const recentOrdersCount = Object.values(restaurant.orders)
            .filter(order => order.supplierId === supplierWhatsapp)
            .length;

          suppliers.push({
            id: supplierWhatsapp,
            whatsapp: supplier.whatsapp,
            name: supplier.name,
            category: supplier.category,
            deliveryDays: supplier.deliveryDays,
            cutoffHour: supplier.cutoffHour,
            rating: supplier.rating,
            restaurantId,
            restaurantName: restaurant.name,
            productCount: products.length,
            products: products,
            recentOrdersCount,
            createdAt: supplier.createdAt.toDate()
          });
        });
      });

      return suppliers;
    } catch (error) {
      console.error('Error processing suppliers:', error);
      return [];
    }
  }, [data]);

  // Filter suppliers based on search and category
  const filteredSuppliers = useMemo(() => {
    return enhancedSuppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.whatsapp.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || supplier.category.includes(selectedCategory);
      
      return matchesSearch && matchesCategory;
    });
  }, [enhancedSuppliers, searchTerm, selectedCategory]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    try {
      const totalSuppliers = enhancedSuppliers.length;
      const totalProducts = enhancedSuppliers.reduce((sum, s) => sum + s.productCount, 0);
      const averageRating = totalSuppliers > 0 
        ? enhancedSuppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / totalSuppliers 
        : 0;
      
      // Category distribution
      const categoryStats = enhancedSuppliers.reduce((acc, supplier) => {
        supplier.category.forEach(cat => {
          acc[cat] = (acc[cat] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      const mostPopularCategory = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)[0];

      return {
        totalSuppliers,
        totalProducts,
        averageRating,
        categoryStats,
        mostPopularCategory: mostPopularCategory ? {
          name: categoryNames[mostPopularCategory[0]] || mostPopularCategory[0],
          count: mostPopularCategory[1]
        } : null
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalSuppliers: 0,
        totalProducts: 0,
        averageRating: 0,
        categoryStats: {},
        mostPopularCategory: null
      };
    }
  }, [enhancedSuppliers]);

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
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

  const SupplierCard = ({ supplier }: { supplier: EnhancedSupplier }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                {supplier.restaurantName}
              </CardDescription>
            </div>
          </div>
          {supplier.category.map(categor => getCategoryBadge(categor))}
        </div>
      </CardHeader>
      <CardContent className='h-[fill-available]* overflow-y-auto'>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{supplier.whatsapp}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {supplier.deliveryDays.map(day => dayNames[day]).join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>סגירת הזמנות: {supplier.cutoffHour}:00</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{supplier.productCount} מוצרים</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getRatingStars(supplier.rating || 0)}
              <span className="text-sm text-muted-foreground mr-1">({supplier.rating})</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {getRelativeTime(supplier.createdAt)}
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
                  setSelectedSupplier(supplier);
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
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עריכה</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>מחיקה</p>
            </TooltipContent>
          </Tooltip> */}
        </div>
      </CardContent>
    </Card>
  );

  const SupplierTable = ({ suppliers }: { suppliers: EnhancedSupplier[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full backdrop-blur-lg bg-card/80">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="border-b">
              <th className="text-right p-3 font-medium text-sm">שם הספק</th>
              <th className="text-right p-3 font-medium text-sm">מסעדה</th>
              <th className="text-right p-3 font-medium text-sm">WhatsApp</th>
              <th className="text-right p-3 font-medium text-sm">קטגוריות</th>
              <th className="text-right p-3 font-medium text-sm">ימי משלוח</th>
              <th className="text-right p-3 font-medium text-sm">שעת סגירה</th>
              <th className="text-right p-3 font-medium text-sm">מוצרים</th>
              <th className="text-right p-3 font-medium text-sm">דירוג</th>
              <th className="text-right p-3 font-medium text-sm">הזמנות</th>
              <th className="text-right p-3 font-medium text-sm">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* <Truck className="w-4 h-4 text-muted-foreground" /> */}
                    <span className="font-medium">{supplier.name}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* <Store className="w-4 h-4 text-muted-foreground" /> */}
                    <span>{supplier.restaurantName}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* <Phone className="w-4 h-4 text-muted-foreground" /> */}
                    <span className="text-sm">{supplier.whatsapp}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {supplier.category.slice(0, 2).map(category => getCategoryBadge(category))}
                    {supplier.category.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{supplier.category.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="text-sm">
                    {supplier.deliveryDays.map(day => dayNames[day]).slice(0, 3).join(', ')}
                    {supplier.deliveryDays.length > 3 && (
                      <span className="text-muted-foreground"> +{supplier.deliveryDays.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.cutoffHour}:00</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {/* <Package className="w-4 h-4 text-muted-foreground" /> */}
                    <span className="text-sm font-medium">{supplier.productCount}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {getRatingStars(supplier.rating || 0).slice(0, 1)}
                    <span className="text-sm">{supplier.rating || 0}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="default" className="text-xs">
                    {supplier.recentOrdersCount}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSupplier(supplier);
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className='flex-1 overflow-y-auto'>
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
          <h1 className="text-3xl font-bold">ספקים</h1>
          <p className="text-muted-foreground">
            נהל את כל הספקים במערכת
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              הוסף ספק
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>הוסף ספק חדש</DialogTitle>
              <DialogDescription>
                הזן את פרטי הספק החדש
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">שם הספק</Label>
                  <Input id="supplier-name" placeholder="שם הספק" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">מספר WhatsApp</Label>
                  <Input id="whatsapp" placeholder="+972-50-1234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">קטגוריה</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="">בחר קטגוריה</option>
                    {Object.entries(categoryNames).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoff-hour">שעת סגירת הזמנות</Label>
                  <Input id="cutoff-hour" type="number" min="0" max="23" placeholder="16" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ימי משלוח</Label>
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input type="checkbox" className='mx-1' id={`day-${index}`} />
                      <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">ביטול</Button>
              <Button>שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              סה״כ ספקים
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <Progress value={100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              סה״כ מוצרים
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ממוצע {Math.round(stats.totalProducts / stats.totalSuppliers)} מוצרים לספק
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              דירוג ממוצע
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {getRatingStars(stats.averageRating)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              קטגוריה פופולרית
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 overflow-y-auto'>
            <div className="text-2xl font-bold text-green-600">
              {stats.mostPopularCategory?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.mostPopularCategory?.name || 'אין נתונים'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
         <div className="flex items-center gap-2 max-sm:hidden">
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
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative max-w-md flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם ספק, מסעדה או מספר WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(categoryNames).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category Distribution Chart */}
      <Card className="mb-6 hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            התפלגות קטגוריות
          </CardTitle>
          <CardDescription>
            התפלגות הספקים לפי קטגוריות
          </CardDescription>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          <div className="space-y-3* flex-wrap flex justify-between">
            {Object.entries(stats.categoryStats)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex flex-col items-center gap-4 justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(category)}
                    {/* <span className="text-sm">{categoryNames[category] || category}</span> */}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(count / stats.totalSuppliers) * 100} 
                      className="w-24" 
                    />
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="items-center justify-between md:hidden ">
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
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Suppliers Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">לא נמצאו ספקים</h3>
              <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {filteredSuppliers.length > 0 ? (
            <SupplierTable suppliers={filteredSuppliers} />
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">לא נמצאו ספקים</h3>
              <p className="text-muted-foreground">נסה לשנות את מונחי החיפוש או המסנן</p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Supplier Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto p-0">
          {selectedSupplier && (
            <>
              <DialogHeader className="p-6 pb-4 pr-16 sticky top-0 bg-background z-10 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      {selectedSupplier.name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-1 mt-1">
                      <Store className="w-4 h-4" />
                      {selectedSupplier.restaurantName}
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
                    <TabsTrigger value="schedule">לוח זמנים</TabsTrigger>
                    <TabsTrigger value="products">מוצרים</TabsTrigger>
                    <TabsTrigger value="analytics">נתונים</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent dir='rtl' value="general" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>שם הספק</Label>
                        <Input value={selectedSupplier.name} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>מסעדה</Label>
                        <Input value={selectedSupplier.restaurantName} readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>WhatsApp</Label>
                        <Input value={selectedSupplier.whatsapp} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>קטגוריה</Label>
                        <div className="pt-2 flex gap-2">
                          {selectedSupplier.category.map((cat) => getCategoryBadge(cat))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>דירוג</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {getRatingStars(selectedSupplier.rating || 0)}
                          </div>
                          <span>({selectedSupplier.rating || 0})</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>מספר מוצרים</Label>
                        <Input value={selectedSupplier.productCount.toString()} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>הזמנות</Label>
                        <Input value={selectedSupplier.recentOrdersCount.toString()} readOnly />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="schedule" className="space-y-6 mt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">לוח זמני משלוח שבועי</h3>
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="grid grid-cols-7 bg-muted/20">
                            {dayNames.map((day, index) => (
                              <div key={index} className="text-center p-2 border-b font-medium">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7">
                            {dayNames.map((day, index) => {
                              const isDeliveryDay = selectedSupplier.deliveryDays.includes(index);
                              return (
                                <div 
                                  key={index} 
                                  className={` flex flex-col items-center justify-center p-4 border-l last:border-r-0 relative ${
                                    isDeliveryDay 
                                      ? 'bg-green-50 dark:bg-green-900/30' 
                                      : ''
                                  }`}
                                >
                                  {isDeliveryDay ? (
                                    <>
                                      <Truck className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200">
                                        יום משלוח
                                      </Badge>
                                      {index === selectedSupplier.deliveryDays[0] && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">אין משלוח</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              שעת סגירת הזמנות:
                                  <div className="relative font-bold">{selectedSupplier.cutoffHour}:00</div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className='flex-1 overflow-y-auto'>
                            <div className="flex items-center justify-center pt-2">
                              <div className="relative w-24 h-24">
                                <div className="w-full h-full rounded-full border-4 border-muted flex items-center justify-center">
                                </div>
                                <div 
                                  className="absolute w-[2px] h-12 bg-blue-500/20 rounded-full origin-bottom" 
                                  style={{ 
                                    bottom: '50%', 
                                    left: 'calc(50% - 1px)', 
                                    transform: `rotate(${(selectedSupplier.cutoffHour / 12) * 360}deg)` 
                                  }}
                                />
                                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                            <p className="text-center text-sm text-muted-foreground mt-4">
                              יש לשלוח הזמנות לפני השעה {selectedSupplier.cutoffHour}:00
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="products" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">מוצרים ({selectedSupplier.productCount})</h3>
                        {/* <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          הוסף מוצר
                        </Button> */}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedSupplier.products.map((product) => (
                          <Card key={product.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{product.emoji}</span>
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-muted-foreground"> {product.unit}</div>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <div>אמצע שבוע: {product.parMidweek}</div>
                                  <div>סוף שבוע: {product.parWeekend}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="analytics" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">פעילות הזמנות</CardTitle>
                        </CardHeader>
                        <CardContent className='flex-1 overflow-y-auto'>
                          <div className="text-2xl font-bold">{selectedSupplier.recentOrdersCount}</div>
                          <p className="text-xs text-muted-foreground">הזמנות סה״כ</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">מגוון מוצרים</CardTitle>
                        </CardHeader>
                        <CardContent className='flex-1 overflow-y-auto'>
                          <div className="text-2xl font-bold">{selectedSupplier.productCount}</div>
                          <p className="text-xs text-muted-foreground">מוצרים זמינים</p>
                        </CardContent>
                      </Card>
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
