'use client';

import { useState } from 'react';
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
import { Supplier, Product } from '@/lib/types';
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
  MapPin,
  Filter
} from 'lucide-react';

// Mock data for development
const mockSuppliers: (Partial<Supplier> & { restaurantName: string; productCount: number })[] = [
  {
    id: 'sup-1',
    restaurantName: 'בית קפה הדרך',
    name: 'ירקות השדה',
    whatsapp: '+972-50-1111111',
    deliveryDays: [1, 3, 5], // Mon, Wed, Fri
    cutoffHour: 16,
    category: 'vegetables',
    rating: 4.8,
    productCount: 25
  },
  {
    id: 'sup-2',
    restaurantName: 'פיצה רומא',
    name: 'מחלבת הגולן',
    whatsapp: '+972-52-2222222',
    deliveryDays: [0, 2, 4, 6], // Sun, Tue, Thu, Sat
    cutoffHour: 14,
    category: 'dairy',
    rating: 4.5,
    productCount: 18
  },
  {
    id: 'sup-3',
    restaurantName: 'סושי יאמה',
    name: 'דגי הים התיכון',
    whatsapp: '+972-54-3333333',
    deliveryDays: [1, 2, 3, 4, 5], // Mon-Fri
    cutoffHour: 18,
    category: 'fish',
    rating: 4.9,
    productCount: 12
  },
  {
    id: 'sup-4',
    restaurantName: 'בית קפה הדרך',
    name: 'בשר טרי',
    whatsapp: '+972-53-4444444',
    deliveryDays: [0, 3], // Sun, Wed
    cutoffHour: 12,
    category: 'meat',
    rating: 4.3,
    productCount: 8
  },
  {
    id: 'sup-5',
    restaurantName: 'פיצה רומא',
    name: 'כלים חד פעמיים',
    whatsapp: '+972-50-5555555',
    deliveryDays: [1], // Mon
    cutoffHour: 10,
    category: 'disposables',
    rating: 4.0,
    productCount: 45
  }
];

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
  eggs: 'ביצים'
};

const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<typeof mockSuppliers[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.whatsapp?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || supplier.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      vegetables: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      fruits: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      fish: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      meat: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      dairy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
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

  const SupplierCard = ({ supplier }: { supplier: typeof mockSuppliers[0] }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription>{supplier.restaurantName}</CardDescription>
            </div>
          </div>
          {getCategoryBadge(supplier.category || '')}
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
              {supplier.deliveryDays?.map(day => dayNames[day]).join(', ')}
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
          <div className="flex items-center gap-1">
            {getRatingStars(supplier.rating || 0)}
            <span className="text-sm text-muted-foreground mr-1">({supplier.rating})</span>
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
          <p className="text-muted-foreground">נהל את כל הספקים במערכת</p>
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
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">כל הקטגוריות</option>
            {Object.entries(categoryNames).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ ספקים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ספקי ירקות ופירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {suppliers.filter(s => s.category === 'vegetables' || s.category === 'fruits').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ספקי בשר ודגים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suppliers.filter(s => s.category === 'meat' || s.category === 'fish').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">דירוג ממוצע</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </div>

      {/* Supplier Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {selectedSupplier.name}
                </DialogTitle>
                <DialogDescription>
                  פרטי ספק מלאים
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">כללי</TabsTrigger>
                  <TabsTrigger value="schedule">לוח זמנים</TabsTrigger>
                  <TabsTrigger value="products">מוצרים</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
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
                      <Input value={categoryNames[selectedSupplier.category || 0] || selectedSupplier.category} readOnly />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </TabsContent>
                
                <TabsContent value="schedule" className="space-y-4">
                  <div className="space-y-2">
                    <Label>ימי משלוח</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className={`p-2 rounded-md text-sm ${
                            selectedSupplier.deliveryDays?.includes(index) 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {day}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>שעת סגירת הזמנות</Label>
                    <Input value={`${selectedSupplier.cutoffHour}:00`} readOnly />
                  </div>
                </TabsContent>
                
                <TabsContent value="products" className="space-y-4">
                  <div className="text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2" />
                    <p>רשימת המוצרים תוצג כאן</p>
                    <p className="text-sm">בקרוב: נהל את כל המוצרים של הספק</p>
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
