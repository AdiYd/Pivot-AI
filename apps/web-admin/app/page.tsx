"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

// Mock data - replace with real Firebase queries
const mockStats = {
  totalRestaurants: 24,
  activeRestaurants: 18,
  totalSuppliers: 156,
  totalOrders: 342,
  pendingOrders: 23,
  completedOrders: 319,
  activeConversations: 12,
  totalConversations: 89
};

const mockRecentActivity = [
  {
    id: "1",
    type: "order",
    restaurant: "מסעדת הטאבון",
    action: "הזמינה מספק הירקות",
    timestamp: "לפני 5 דקות",
    status: "pending"
  },
  {
    id: "2", 
    type: "conversation",
    restaurant: "פיצרית רומא",
    action: "התחילה שיחה חדשה",
    timestamp: "לפני 15 דקות",
    status: "active"
  },
  {
    id: "3",
    type: "delivery",
    restaurant: "מסעדת השף",
    action: "קיבלה משלוח מספק הבשר",
    timestamp: "לפני 30 דקות", 
    status: "completed"
  },
  {
    id: "4",
    type: "payment",
    restaurant: "בית קפה אספרסו",
    action: "שילמה עבור המנוי",
    timestamp: "לפני שעה",
    status: "completed"
  }
];

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: number; 
  description: string; 
  icon: any; 
  trend?: { value: number; isPositive: boolean } 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString('he-IL')}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend && (
            <span className={`flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-3 w-3" />
              {trend.value}%
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">ממתין</Badge>;
    case "active":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">פעיל</Badge>;
    case "completed":
      return <Badge variant="outline" className="text-green-600 border-green-600">הושלם</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "order":
      return <ShoppingCart className="h-4 w-4 text-blue-600" />;
    case "conversation":
      return <MessageSquare className="h-4 w-4 text-green-600" />;
    case "delivery":
      return <Package className="h-4 w-4 text-purple-600" />;
    case "payment":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">דף הבית</h1>
        <p className="text-muted-foreground">
          ברוך הבא למערכת ניהול המסעדות שלך. כאן תוכל לעקוב אחרי סטטיסטיקות, פעילות אחרונה, התראות וסטטוס המערכת.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="מסעדות רשומות"
          value={mockStats.totalRestaurants}
          description={`${mockStats.activeRestaurants} פעילות`}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="ספקים במערכת"
          value={mockStats.totalSuppliers}
          description="בכל הקטגוריות"
          icon={Package}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="הזמנות החודש"
          value={mockStats.totalOrders}
          description={`${mockStats.pendingOrders} ממתינות`}
          icon={ShoppingCart}
          trend={{ value: 23, isPositive: true }}
        />
        <StatCard
          title="שיחות פעילות"
          value={mockStats.activeConversations}
          description={`מתוך ${mockStats.totalConversations} שיחות`}
          icon={MessageSquare}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Tabs Section */}      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">פעילות אחרונה</TabsTrigger>
          <TabsTrigger value="alerts">התראות</TabsTrigger>
          <TabsTrigger value="analytics">אנליטיקה</TabsTrigger>
          <TabsTrigger value="system">סטטוס מערכת</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                פעילות אחרונה
              </CardTitle>
              <CardDescription>
                עדכונים אחרונים במערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <p className="font-medium">{activity.restaurant}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(activity.status)}
                      <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                התראות מערכת
              </CardTitle>
              <CardDescription>
                התראות שדורשות תשומת לב
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="font-medium">3 מסעדות לא השלימו הזמנה</p>
                      <p className="text-sm text-muted-foreground">זמן חיתוך עבר לפני שעתיים</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">פעל</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">5 שיחות ממתינות למענה</p>
                      <p className="text-sm text-muted-foreground">ללא תגובה ליותר מ-30 דקות</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">צפה</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                סטטיסטיקות שימוש
              </CardTitle>
              <CardDescription>
                נתונים על השימוש במערכת השבוע האחרון
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">הזמנות אוטומטיות</span>
                    <span className="text-sm font-medium">89%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '89%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">זמן תגובה ממוצע</span>
                    <span className="text-sm font-medium">2.3 דקות</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '76%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                סטטוס מערכת
              </CardTitle>
              <CardDescription>
                מצב הרכיבים והשירותים במערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">תצורת בוט</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      פעיל
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    הגדרות ותצורת בוט נטענו בהצלחה
                  </div>
                  <Button variant="outline" size="sm" className="self-start mt-auto">
                    <a href="/bot-config">עריכת הגדרות</a>
                  </Button>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">מסד נתונים</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      מחובר
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    חיבור פעיל ל-Firestore, 5 אוספים פעילים
                  </div>
                  <Button variant="outline" size="sm" className="self-start mt-auto">
                    <a href="/raw-data">צפייה בנתונים</a>
                  </Button>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">שירות Twilio</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      מחובר
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    נשלחו 243 הודעות ב-24 השעות האחרונות
                  </div>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">שירות AI</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      פעיל
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    גרסת מודל: GPT-4o, 198 פניות ב-24 שעות אחרונות
                  </div>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">הגדרות זרימה</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      מעודכן
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    הגדרות הבוט מעודכנות לגרסה האחרונה
                  </div>
                  <Button variant="outline" size="sm" className="self-start mt-auto">
                    <a href="/workflow">עריכת זרימה</a>
                  </Button>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">שרת Firebase</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      פעיל
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cloud Functions פועלות בצורה תקינה, 0 שגיאות
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
