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
import { Restaurant, Contact } from '@/lib/types';
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
  Clock
} from 'lucide-react';

// Mock data for development
const mockRestaurants: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'בית קפה הדרך',
    legalId: '515123456',
    businessName: 'הדרך קפה ומסעדה בע״מ',
    yearsActive: 3,
    createdAt: new Date('2022-01-15'),
    isActivated: true,
    primaryContact: {
      name: 'יוסי כהן',
      role: 'Owner',
      phone: '+972-50-1234567',
      email: 'yossi@hadere-cafe.co.il'
    },
    payment: {
      provider: 'Stripe',
      customerId: 'cus_123456',
      status: 'active'
    },
    settings: {
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL'
    }
  },
  {
    id: 'rest-2',
    name: 'פיצה רומא',
    legalId: '516789012',
    businessName: 'רומא פיצריה ומשלוחים בע״מ',
    yearsActive: 7,
    createdAt: new Date('2018-05-20'),
    isActivated: true,
    primaryContact: {
      name: 'מרקו רוסי',
      role: 'Manager',
      phone: '+972-52-9876543',
      email: 'marco@pizza-roma.co.il'
    },
    payment: {
      provider: 'Paylink',
      customerId: 'pl_789012',
      status: 'active'
    },
    settings: {
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL'
    }
  },
  {
    id: 'rest-3',
    name: 'סושי יאמה',
    legalId: '517345678',
    businessName: 'יאמה סושי ואסיאתי בע״מ',
    yearsActive: 2,
    createdAt: new Date('2023-03-10'),
    isActivated: false,
    primaryContact: {
      name: 'טקאשי סאטו',
      role: 'Owner',
      phone: '+972-54-5555555',
      email: 'takashi@sushi-yama.co.il'
    },
    payment: {
      provider: 'Stripe',
      customerId: 'cus_pending',
      status: 'pending'
    },
    settings: {
      timezone: 'Asia/Jerusalem',
      locale: 'he-IL'
    }
  }
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.legalId.includes(searchTerm)
  );

  const getStatusBadge = (restaurant: Restaurant) => {
    if (restaurant.isActivated && restaurant.payment.status === 'active') {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />פעיל</Badge>;
    } else if (restaurant.payment.status === 'pending') {
      return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />ממתין לתשלום</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />לא פעיל</Badge>;
    }
  };

  const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
              <CardDescription>{restaurant.businessName}</CardDescription>
            </div>
          </div>
          {getStatusBadge(restaurant)}
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
            <span>{restaurant.primaryContact.phone}</span>
          </div>
          {restaurant.primaryContact.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{restaurant.primaryContact.email}</span>
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
          <h1 className="text-3xl font-bold">מסעדות</h1>
          <p className="text-muted-foreground">נהל את כל המסעדות במערכת</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              הוסף מסעדה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>הוסף מסעדה חדשה</DialogTitle>
              <DialogDescription>
                הזן את פרטי המסעדה החדשה
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name">שם המסעדה</Label>
                  <Input id="restaurant-name" placeholder="שם המסעדה" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-id">מספר חברה</Label>
                  <Input id="legal-id" placeholder="ח.פ" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">שם עסקי מלא</Label>
                <Input id="business-name" placeholder="שם עסקי מלא" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">איש קשר ראשי</Label>
                <Input id="contact-name" placeholder="שם מלא" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">טלפון</Label>
                  <Input id="contact-phone" placeholder="+972-50-1234567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">אימייל</Label>
                  <Input id="contact-email" type="email" placeholder="example@domain.com" />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ מסעדות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restaurants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">מסעדות פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {restaurants.filter(r => r.isActivated && r.payment.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ממתינות לתשלום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {restaurants.filter(r => r.payment.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">לא פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {restaurants.filter(r => !r.isActivated || r.payment.status !== 'active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      {/* Restaurant Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRestaurant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {selectedRestaurant.name}
                </DialogTitle>
                <DialogDescription>
                  פרטי מסעדה מלאים
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">כללי</TabsTrigger>
                  <TabsTrigger value="contact">איש קשר</TabsTrigger>
                  <TabsTrigger value="payment">תשלום</TabsTrigger>
                  <TabsTrigger value="settings">הגדרות</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>שנות פעילות</Label>
                      <Input value={selectedRestaurant.yearsActive.toString()} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>תאריך הצטרפות</Label>
                      <Input value={selectedRestaurant.createdAt.toLocaleDateString('he-IL')} readOnly />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={selectedRestaurant.isActivated} disabled />
                    <Label>מסעדה פעילה</Label>
                  </div>
                </TabsContent>
                
                <TabsContent value="contact" className="space-y-4">
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
                  <div className="space-y-2">
                    <Label>טלפון</Label>
                    <Input value={selectedRestaurant.primaryContact.phone} readOnly />
                  </div>
                  {selectedRestaurant.primaryContact.email && (
                    <div className="space-y-2">
                      <Label>אימייל</Label>
                      <Input value={selectedRestaurant.primaryContact.email} readOnly />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="payment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ספק תשלומים</Label>
                      <Input value={selectedRestaurant.payment.provider} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>סטטוס</Label>
                      <Input value={selectedRestaurant.payment.status} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>מזהה לקוח</Label>
                    <Input value={selectedRestaurant.payment.customerId} readOnly />
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
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
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
