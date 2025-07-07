'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Plus, Search, Truck, Calendar, Clock, Phone, Star, Package, 
  Eye, Store, Filter, TrendingUp, X, Table as TableIcon,
  RefreshCw,
  Trash2,
  ClipboardCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import the actual database
import exampleDatabase from '@/schema/example';
import { DataBase, Days, Restaurant, Supplier, SupplierCategory } from '@/schema/types';
import { getCategoryBadge } from '@/components/ui/badge';
import { Icon } from '@iconify/react/dist/iconify.js';
import { CATEGORIES_DICT, WEEKDAYS_DICT } from '@/schema/states';
import { DebugButton, debugFunction } from '@/components/debug';
import { db, useFirebase } from '@/lib/firebaseClient';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

// Types for enhanced supplier data
interface EnhancedSupplier extends Supplier {
  restaurantId: string;
  restaurantName: string;
  productCount: number;
  recentOrdersCount: number;
}

const weekDaysDict: Record<number, Days> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat'
}

export default function SuppliersPage() {
  const {database, refreshDatabase, source} = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { toast } = useToast();
  

  // Extract and enhance supplier data from the actual database
  const enhancedSuppliers = useMemo((): EnhancedSupplier[] => {
    try {
      const suppliers: EnhancedSupplier[] = [];
      let suppliersCategoriesList: string[] = [];
      Object.entries(database.restaurants).forEach(([restaurantId, restaurant]) => {
        // Each restaurant has an array of suppliers
        restaurant.suppliers.forEach(supplier => {

          // Count recent orders for this supplier
          const recentOrdersCount = restaurant.orders.filter(order=> database.orders[order].supplier?.whatsapp === supplier.whatsapp).length;
          suppliersCategoriesList.push(...supplier.category);

          suppliers.push({
            ...supplier,
            restaurantId,
            restaurantName: restaurant.name,
            productCount: supplier.products.length,
            recentOrdersCount,
          });
        });
      });
      setSuppliersList(new Set(suppliersCategoriesList).size > 0 ? Array.from(new Set(suppliersCategoriesList)) : []);  
      return suppliers;
    } catch (error) {
      console.error('Error processing suppliers:', error);
      return [];
    }
  }, [database]);

  // Filter suppliers based on search and category
  const filteredSuppliers = useMemo(() => {
    return enhancedSuppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.whatsapp.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || supplier.category.includes(selectedCategory as SupplierCategory);
      
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
          name: mostPopularCategory[0],
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
    if (!(date instanceof Date)) {
      console.error('Invalid date:', date);
      return '';
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const handleDelete = async (restaurantId: string, whatsapp: string) => {
    try {
      console.log('Deleting supplier from restaurant:', restaurantId);
      const restaurantDocRef = doc(db, `restaurants${source}`, restaurantId);
      if (restaurantDocRef) {
        const restaurant = (await getDoc(restaurantDocRef)).data() as Restaurant;
        const restaurantName = restaurant?.name || restaurant.legalName || restaurant.legalId;
        const supplierName = restaurant.suppliers.find(supplier => supplier.whatsapp === whatsapp)?.name;
        const approval = confirm(`האם אתה בטוח שברצונך למחוק את הספק ${supplierName} (${whatsapp}) מהמסעדה ${restaurantName}?

פעולה זאת לא ניתנת לשחזור.`);
        if (!approval) return;
        // Remove from restaurant<restaurantId>(doc) -> suppliers<supplierWhatsapp>(collection)
        const supplierDocRef = doc(db, `restaurants${source}`, restaurantId, 'suppliers', whatsapp);
        await deleteDoc(supplierDocRef);
        await refreshDatabase();
        toast({
          title: `ספק ${supplierName} של מסעדה ${restaurantName} נמחק`,
          description: "הספק נמחק בהצלחה מהמערכת",
          variant: "success",
        });
       }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הספק",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex flex-wrap justify-end gap-1">
            {supplier.category.map((cat, idx) => (
              getCategoryBadge(cat)
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[stretch]* overflow-y-auto'>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{supplier.whatsapp}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {supplier.cutoff.length > 0
                ? supplier.cutoff.map(reminder => WEEKDAYS_DICT[reminder.day]).join(', ')
                : 'אין ימי חיתוך מוגדרים'}
            </span>
          </div>
         
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{supplier.productCount} מוצרים</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {getRatingStars(supplier.rating || 0)}
              <span className="text-sm text-muted-foreground mr-1">({supplier.rating || 0})</span>
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
        </div>
      </CardContent>
    </Card>
  );

  const SupplierTable = ({ suppliers }: { suppliers: EnhancedSupplier[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם הספק</TableHead>
              <TableHead className="text-right">מסעדה</TableHead>
              <TableHead className="text-right hidden">WhatsApp</TableHead>
              <TableHead className="text-right">קטגוריות</TableHead>
              <TableHead className="text-right">ימי חיתוך</TableHead>
              <TableHead className="text-right hidden">שעת סגירה</TableHead>
              <TableHead className="text-right">מוצרים</TableHead>
              <TableHead className="text-right hidden">דירוג</TableHead>
              <TableHead className="text-right">הזמנות</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow 
                onClick={() => {
                  setSelectedSupplier(supplier);
                  setIsDialogOpen(true);
                }}
               key={supplier.whatsapp} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{supplier.restaurantName}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{supplier.whatsapp}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {supplier.category.slice(0, 2).map((category, idx) => (
                      getCategoryBadge(category)
                    ))}
                    {supplier.category.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{supplier.category.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm grid min-w-[200px]">
                    {supplier.cutoff.length > 0
                      ? supplier.cutoff.map(reminder => `${WEEKDAYS_DICT[reminder.day]} ${reminder.time}`).slice(0, 3).join(', ')
                      : 'לא מוגדר'}
                    {supplier.cutoff.length > 3 && (
                      <span className="text-muted-foreground"> +{supplier.cutoff.length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm mr-3 font-medium">{supplier.productCount}</span>
                </TableCell>
                <TableCell className="hidden">
                  <div className="flex items-center gap-1">
                    {getRatingStars(supplier.rating || 0).slice(0, 1)}
                    <span className="text-sm">{supplier.rating || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='mr-3'>
                    {supplier.recentOrdersCount}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                  size="icon"
                  title='מחק ספק'
                   variant='outline'
                   onClick={(e) => {e.stopPropagation(); handleDelete(supplier.restaurantId, supplier.whatsapp)}} 
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="p-4 max-sm:p-2 space-y-6">
      <DebugButton debugFunction={debugFunction} />
      {/* Header */}
      <div style={{marginTop:'0px'}} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ספקים</h1>
          <p className="text-muted-foreground">
            נהל את כל הספקים במערכת
          </p>
        </div>
        <div className='flex gap-4'>
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
            <Button className='max-sm:hidden' onClick={refreshDatabase}>
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן
            </Button>
          </div>
        </div>
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
              ממוצע {stats.totalSuppliers > 0 
                ? Math.round(stats.totalProducts / stats.totalSuppliers) 
                : 0} מוצרים לספק
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
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative max-w-md flex-2">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="חיפוש לפי שם ספק, מסעדה או מספר WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Filter className="w-4 max-sm:hidden h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {suppliersList.map((category) => (
                <SelectItem key={category} value={category}>{CATEGORIES_DICT[category]?.name || category}</SelectItem>
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

      {/* Suppliers Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <SupplierCard key={supplier.whatsapp} supplier={supplier} />
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
        <DialogContent className="max-w-6xl dark:bg-stone-950 flex flex-col max-h-[85vh] min-h-[80vh] overflow-y-auto p-0">
          {selectedSupplier && (
            <>
              <DialogHeader className="p-6 pb-4 pr-16 h-fit sticky top-0 bg-background z-10 border-b">
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
                    <TabsTrigger value="cutoff">זמני חיתוך</TabsTrigger>
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
                          {selectedSupplier.category.map((cat) => (
                            getCategoryBadge(cat)
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* <div className="space-y-2">
                        <Label>דירוג</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {getRatingStars(selectedSupplier.rating || 0)}
                          </div>
                          <span>({selectedSupplier.rating || 0})</span>
                        </div>
                      </div> */}
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

                  <TabsContent dir='rtl' value="cutoff" className="space-y-6 mt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">לוח זמני חיתוך שבועי</h3>
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="grid grid-cols-7 bg-muted/20">
                            {Object.entries(WEEKDAYS_DICT).map(([key, value], index) => (
                              <div key={index} className="text-center p-2 border-b font-medium">
                                {value}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7">
                            {Object.entries(WEEKDAYS_DICT).map(([key, value], index) => {
                              const isDeliveryDay = selectedSupplier.cutoff.find(reminder => reminder.day === weekDaysDict[index]);
                              return (
                                <div 
                                  key={index} 
                                  className={`flex flex-col items-center justify-center p-4 border-l last:border-r-0 relative ${
                                    isDeliveryDay 
                                      ? 'bg-green-50 dark:bg-green-900/30' 
                                      : ''
                                  }`}
                                >
                                  {isDeliveryDay ? (
                                    <>
                                      <ClipboardCheck className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                                      <div className="text-sm mt-2">
                                        {isDeliveryDay.time}
                                      </div>

                                    </>
                                  ) : (
                                    <></>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent dir='rtl' value="products" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">מוצרים ({selectedSupplier.productCount})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedSupplier.products.length > 0 ? (
                          selectedSupplier.products.map((product) => (
                            <Card key={product.name}>
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
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-8">
                            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">אין מוצרים להצגה</p>
                          </div>
                        )}
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

