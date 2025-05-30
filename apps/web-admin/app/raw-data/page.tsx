'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { 
  Database, 
  Search, 
  Download, 
  Upload,
  RefreshCw,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  FileJson,
  FileText,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mock raw data for demonstration
const mockCollections = {
  restaurants: [
    {
      id: 'rest_001',
      name: 'מסעדת הגליל',
      legalId: '12345678',
      businessName: 'הגליל מזון בע"מ',
      yearsActive: 5,
      isActivated: true,
      createdAt: '2024-01-15T10:30:00Z',
      primaryContact: {
        name: 'יוסי כהן',
        role: 'Owner',
        phone: '+972501234567',
        email: 'yossi@galil-restaurant.co.il'
      },
      payment: {
        provider: 'Stripe',
        customerId: 'cus_stripe123',
        status: 'active'
      },
      settings: {
        timezone: 'Asia/Jerusalem',
        locale: 'he-IL'
      }
    },
    {
      id: 'rest_002',
      name: 'פיצה רומא',
      legalId: '87654321',
      businessName: 'רומא פיצה ושתיה בע"מ',
      yearsActive: 3,
      isActivated: false,
      createdAt: '2024-02-20T14:45:00Z',
      primaryContact: {
        name: 'מרקו רוסי',
        role: 'Manager',
        phone: '+972502345678',
        email: 'marco@pizza-roma.co.il'
      },
      payment: {
        provider: 'Paylink',
        customerId: 'pay_link456',
        status: 'pending'
      },
      settings: {
        timezone: 'Asia/Jerusalem',
        locale: 'he-IL'
      }
    }
  ],
  suppliers: [
    {
      id: 'sup_001',
      restaurantId: 'rest_001',
      name: 'ירקות טריים חקלאי',
      whatsapp: '+972501111111',
      deliveryDays: [1, 3, 5],
      cutoffHour: 14,
      category: 'vegetables',
      rating: 4.5,
      createdAt: '2024-01-20T09:00:00Z'
    },
    {
      id: 'sup_002',
      restaurantId: 'rest_001',
      name: 'דגים טריים ים התיכון',
      whatsapp: '+972502222222',
      deliveryDays: [2, 4, 6],
      cutoffHour: 12,
      category: 'fish',
      rating: 4.8,
      createdAt: '2024-01-25T11:30:00Z'
    }
  ],
  orders: [
    {
      id: 'ord_001',
      restaurantId: 'rest_001',
      supplierId: 'sup_001',
      status: 'delivered',
      midweek: true,
      items: [
        { productId: 'prod_001', qty: 5 },
        { productId: 'prod_002', qty: 3 }
      ],
      createdAt: '2024-01-30T08:00:00Z',
      sentAt: '2024-01-30T08:15:00Z',
      receivedAt: '2024-01-31T07:30:00Z',
      invoiceUrl: 'https://storage.example.com/invoices/ord_001.jpg',
      shortages: []
    }
  ],
  products: [
    {
      id: 'prod_001',
      supplierId: 'sup_001',
      name: 'עגבניות',
      emoji: '🍅',
      unit: 'kg',
      parMidweek: 10,
      parWeekend: 15,
      createdAt: '2024-01-20T09:30:00Z'
    },
    {
      id: 'prod_002',
      supplierId: 'sup_001',
      name: 'מלפפונים',
      emoji: '🥒',
      unit: 'kg',
      parMidweek: 8,
      parWeekend: 12,
      createdAt: '2024-01-20T09:35:00Z'
    }
  ],
  conversations: [
    {
      id: 'conv_001',
      restaurantId: 'rest_001',
      whatsappNumber: '+972501234567',
      currentState: 'INVENTORY_CHECK',
      context: {
        supplierId: 'sup_001',
        orderData: {}
      },
      lastMessageAt: '2024-01-30T10:00:00Z',
      createdAt: '2024-01-15T10:30:00Z'
    }
  ]
};

type CollectionName = keyof typeof mockCollections;

export default function RawDataPage() {
  const [selectedCollection, setSelectedCollection] = useState<CollectionName>('restaurants');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState('');
  const { toast } = useToast();

  const filteredData = mockCollections[selectedCollection].filter((item: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return JSON.stringify(item).toLowerCase().includes(searchLower);
  });

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setEditData(JSON.stringify(item, null, 2));
    setIsEditing(false);
  };

  const handleEditItem = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const parsedData = JSON.parse(editData);
      // Here would be the actual save logic
      setSelectedItem(parsedData);
      setIsEditing(false);
      toast({
        title: "נתונים נשמרו",
        description: "הנתונים עודכנו בהצלחה במסד הנתונים",
      });
    } catch (error) {
      toast({
        title: "שגיאה בפרסום",
        description: "הנתונים אינם בפורמט JSON תקין",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (item: any) => {
    // Here would be the actual delete logic
    toast({
      title: "פריט נמחק",
      description: `פריט ${item.id} נמחק בהצלחה`,
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(mockCollections[selectedCollection], null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "נתונים יוצאו",
      description: `נתוני ${selectedCollection} יוצאו בהצלחה`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק ללוח",
      description: "הנתונים הועתקו ללוח העריכה",
    });
  };

  const getStatusBadge = (item: any) => {
    if (selectedCollection === 'restaurants') {
      return item.isActivated ? 
        <Badge className="bg-green-100 text-green-800">פעיל</Badge> :
        <Badge variant="secondary">לא פעיל</Badge>;
    }
    if (selectedCollection === 'orders') {
      const statusMap = {
        pending: { text: 'ממתין', variant: 'secondary' as const },
        sent: { text: 'נשלח', variant: 'default' as const },
        delivered: { text: 'נמסר', variant: 'default' as const }
      };
      const status = statusMap[item.status as keyof typeof statusMap];
      return <Badge variant={status.variant}>{status.text}</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              נתונים גולמיים
            </h1>
            <p className="text-muted-foreground mt-1">
              צפייה ועריכה ישירה של נתוני מסד הנתונים
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLoading(true)}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              רענן
            </Button>
            <Button
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 ml-2" />
              יצא נתונים
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Collections List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  אוספי נתונים
                </CardTitle>
                <CardDescription>
                  בחר אוסף נתונים לצפייה ועריכה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(mockCollections).map((collection) => (
                  <Button
                    key={collection}
                    variant={selectedCollection === collection ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedCollection(collection as CollectionName);
                      setSelectedItem(null);
                    }}
                  >
                    {collection === 'restaurants' && '🏪 מסעדות'}
                    {collection === 'suppliers' && '🚚 ספקים'}
                    {collection === 'orders' && '📦 הזמנות'}
                    {collection === 'products' && '🥕 מוצרים'}
                    {collection === 'conversations' && '💬 שיחות'}
                    <Badge variant="secondary" className="mr-auto">
                      {mockCollections[collection as CollectionName].length}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Search */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-4 w-4" />
                  חיפוש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="search">חיפוש בנתונים</Label>
                  <Input
                    id="search"
                    placeholder="הקלד טקסט לחיפוש..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedCollection === 'restaurants' && 'רשימת מסעדות'}
                  {selectedCollection === 'suppliers' && 'רשימת ספקים'}
                  {selectedCollection === 'orders' && 'רשימת הזמנות'}
                  {selectedCollection === 'products' && 'רשימת מוצרים'}
                  {selectedCollection === 'conversations' && 'רשימת שיחות'}
                </CardTitle>
                <CardDescription>
                  {filteredData.length} פריטים נמצאו
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredData.map((item: any) => (
                    <Card key={item.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">ID: {item.id}</span>
                              {getStatusBadge(item)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.name || item.whatsapp || item.status || 'פריט'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              נוצר: {new Date(item.createdAt).toLocaleDateString('he-IL')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewItem(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>צפה בפרטים</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(JSON.stringify(item, null, 2))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>העתק JSON</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>מחק פריט</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredData.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">לא נמצאו נתונים</h3>
                      <p className="text-muted-foreground">
                        נסה לשנות את החיפוש או לבחור אוסף אחר
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Item Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    פרטי פריט: {selectedItem.id}
                  </CardTitle>
                  <CardDescription>
                    עריכה ישירה של נתוני JSON
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <Button
                      size="sm"
                      onClick={handleEditItem}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      ערוך
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        ביטול
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                      >
                        <CheckCircle2 className="h-4 w-4 ml-2" />
                        שמור
                      </Button>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedItem(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto">
                {isEditing ? (
                  <textarea
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="w-full h-96 p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                ) : (
                  <pre className="text-sm bg-muted p-4 rounded-md overflow-auto h-96 font-mono" dir="ltr">
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
