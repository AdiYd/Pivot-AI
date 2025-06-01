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
  Users,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import the actual database
import exampleDatabase from '@/schema/example';

// Types for enhanced supplier data
interface EnhancedSupplier {
  id: string;
  whatsapp: string;
  name: string;
  category: string;
  deliveryDays: number[];
  cutoffHour: number;
  rating: number;
  restaurantId: string;
  restaurantName: string;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    emoji: string;
    unit: string;
    parMidweek: number;
    parWeekend: number;
  }>;
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
  const { toast } = useToast();

  // Extract and enhance supplier data from the actual database
  const enhancedSuppliers = useMemo((): EnhancedSupplier[] => {
    try {
      const suppliers: EnhancedSupplier[] = [];

      Object.entries(data.restaurants).forEach(([restaurantId, restaurant]) => {
        Object.entries(restaurant.suppliers).forEach(([supplierWhatsapp, supplier]) => {
          // Get products for this supplier
          const products = Object.values(supplier.products).map(product => ({
            id: product.id,
            name: product.name,
            emoji: product.emoji,
            unit: product.unit,
            parMidweek: product.parMidweek,
            parWeekend: product.parWeekend
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
            products,
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
      const matchesCategory = selectedCategory === 'all' || supplier.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [enhancedSuppliers, searchTerm, selectedCategory]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    try {
      const totalSuppliers = enhancedSuppliers.length;
      const totalProducts = enhancedSuppliers.reduce((sum, s) => sum + s.productCount, 0);
      const averageRating = totalSuppliers > 0 
        ? enhancedSuppliers.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers 
        : 0;
      
      // Category distribution
      const categoryStats = enhancedSuppliers.reduce((acc, supplier) => {
        acc[supplier.category] = (acc[supplier.category] || 0) + 1;
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

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      vegetables: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      fruits: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      fish: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      meat: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      dairy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      bread: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      coffee: 'bg-brown-100 text-brown-800 dark:bg-brown-900 dark:text-brown-200',
      disposables: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    return (
      <Badge className={colors[category] || colors.disposables}>
        {categoryNames[category] || category}
      </Badge>
    );
  };

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
        <div className="flex items-start justify-between">
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
          {getCategoryBadge(supplier.category)}
        </div>
      </CardHeader>
      <CardContent>
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
              {getRatingStars(supplier.rating)}
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
          <h1 className="text-3xl font-bold">ספקים</h1>
          <p className="text-muted-foreground">
            נהל את כל הספקים במערכת ({stats.totalSuppliers} ספקים, {stats.totalProducts} מוצרים)
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
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input type="checkbox" id={`day-${index}`} />
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

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              סה״כ ספקים
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          <CardContent>
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
          <CardContent>
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
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.mostPopularCategory?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.mostPopularCategory?.name || 'אין נתונים'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            התפלגות קטגוריות
          </CardTitle>
          <CardDescription>
            התפלגות הספקים לפי קטגוריות
          </CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* Suppliers Grid */}
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

      {/* Enhanced Supplier Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0">
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
                  
                  <TabsContent value="general" className="space-y-4 mt-6">
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
                        <div className="pt-2">
                          {getCategoryBadge(selectedSupplier.category)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>דירוג</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {getRatingStars(selectedSupplier.rating)}
                          </div>
                          <span>({selectedSupplier.rating})</span>
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
                  
                  <TabsContent value="schedule" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>ימי משלוח</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {dayNames.map((day, index) => (
                            <div key={index} className="text-center">
                              <div className={`p-3 rounded-md text-sm font-medium ${
                                selectedSupplier.deliveryDays.includes(index) 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {day}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>שעת סגירת הזמנות</Label>
                          <Input value={`${selectedSupplier.cutoffHour}:00`} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label>תאריך הצטרפות</Label>
                          <Input value={selectedSupplier.createdAt.toLocaleDateString('he-IL')} readOnly />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="products" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">מוצרים ({selectedSupplier.productCount})</h3>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          הוסף מוצר
                        </Button>
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
                                    <div className="text-sm text-muted-foreground">יחידה: {product.unit}</div>
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
                  
                  <TabsContent value="analytics" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">פעילות הזמנות</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedSupplier.recentOrdersCount}</div>
                          <p className="text-xs text-muted-foreground">הזמנות סה״כ</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">מגוון מוצרים</CardTitle>
                        </CardHeader>
                        <CardContent>
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
