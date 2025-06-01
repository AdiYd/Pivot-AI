"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Store,
  Clock,
  DollarSign
} from "lucide-react";

// Import the actual database
import exampleDatabase  from "@/schema/example";

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: number | string; 
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
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
        </div>
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
    case "sent":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">נשלח</Badge>;
    case "delivered":
      return <Badge variant="outline" className="text-green-600 border-green-600">הועבר</Badge>;
    case "IDLE":
      return <Badge variant="outline" className="text-gray-600 border-gray-600">סרק</Badge>;
    case "INVENTORY_SNAPSHOT_PRODUCT":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">בדיקת מלאי</Badge>;
    case "ONBOARDING_PAYMENT_METHOD":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">תהליך רישום</Badge>;
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
  const [data, setData] = useState(exampleDatabase);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    try {
      const restaurants = Object.values(data.restaurants);
      const conversations = Object.values(data.conversations);

      // Restaurant stats
      const totalRestaurants = restaurants.length;
      const activeRestaurants = restaurants.filter(r => r.isActivated).length;
      const pendingPaymentRestaurants = restaurants.filter(r => r.payment.status === false).length;

      // Supplier and product stats
      let totalSuppliers = 0;
      let totalProducts = 0;
      restaurants.forEach(restaurant => {
        totalSuppliers += Object.keys(restaurant.suppliers).length;
        Object.values(restaurant.suppliers).forEach(supplier => {
          totalProducts += Object.keys(supplier.products).length;
        });
      });

      // Order stats
      let totalOrders = 0;
      let pendingOrders = 0;
      let sentOrders = 0;
      let deliveredOrders = 0;
      restaurants.forEach(restaurant => {
        const orders = Object.values(restaurant.orders);
        totalOrders += orders.length;
        pendingOrders += orders.filter(o => o.status === "pending").length;
        sentOrders += orders.filter(o => o.status === "sent").length;
        deliveredOrders += orders.filter(o => o.status === "delivered").length;
      });

      // Conversation stats
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.currentState !== "IDLE").length;
      const onboardingConversations = conversations.filter(c => 
        c.currentState.startsWith("ONBOARDING") || c.currentState === "WAITING_FOR_PAYMENT"
      ).length;

      return {
        totalRestaurants,
        activeRestaurants,
        pendingPaymentRestaurants,
        totalSuppliers,
        totalProducts,
        totalOrders,
        pendingOrders,
        sentOrders,
        deliveredOrders,
        totalConversations,
        activeConversations,
        onboardingConversations
      };
    } catch (error) {
      console.error("Error calculating stats:", error);
      return {
        totalRestaurants: 0,
        activeRestaurants: 0,
        pendingPaymentRestaurants: 0,
        totalSuppliers: 0,
        totalProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        sentOrders: 0,
        deliveredOrders: 0,
        totalConversations: 0,
        activeConversations: 0,
        onboardingConversations: 0
      };
    }
  }, [data]);

  // Generate recent activity from real data
  const recentActivity = useMemo(() => {
    try {
      const activities: Array<{
        id: string;
        type: string;
        restaurant: string;
        action: string;
        timestamp: string;
        status: string;
      }> = [];

      // Add order activities
      Object.values(data.restaurants).forEach(restaurant => {
        Object.values(restaurant.orders).forEach(order => {
          const supplier = restaurant.suppliers[order.supplierId];
          if (supplier) {
            activities.push({
              id: `order-${order.id}`,
              type: "order",
              restaurant: restaurant.name,
              action: `הזמינה מ${supplier.name}`,
              timestamp: getRelativeTime(order.createdAt.toDate()),
              status: order.status
            });
          }
        });
      });

      // Add conversation activities
      Object.entries(data.conversations).forEach(([phone, conversation]) => {
        const restaurant = Object.values(data.restaurants).find(r => r.legalId === conversation.restaurantId);
        if (restaurant && conversation.currentState !== "IDLE") {
          activities.push({
            id: `conv-${phone}`,
            type: "conversation",
            restaurant: restaurant.name,
            action: getConversationAction(conversation.currentState),
            timestamp: getRelativeTime(conversation.lastMessageTimestamp.toDate()),
            status: conversation.currentState
          });
        }
      });

      // Sort by timestamp and take latest 5
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    } catch (error) {
      console.error("Error generating activity:", error);
      return [];
    }
  }, [data]);

  // Generate alerts from real data
  const alerts = useMemo(() => {
    try {
      const alertsList: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
      }> = [];

      // Check for restaurants without payment
      if (stats.pendingPaymentRestaurants > 0) {
        alertsList.push({
          id: "payment-pending",
          type: "payment",
          title: `${stats.pendingPaymentRestaurants} מסעדות ממתינות לתשלום`,
          description: "מסעדות לא השלימו תהליך התשלום",
          severity: "high"
        });
      }

      // Check for active conversations needing attention
      if (stats.onboardingConversations > 0) {
        alertsList.push({
          id: "onboarding-pending",
          type: "conversation",
          title: `${stats.onboardingConversations} מסעדות בתהליך רישום`,
          description: "מסעדות ממתינות להשלמת תהליך הרישום",
          severity: "medium"
        });
      }

      // Check for pending orders
      if (stats.pendingOrders > 0) {
        alertsList.push({
          id: "orders-pending",
          type: "order",
          title: `${stats.pendingOrders} הזמנות ממתינות`,
          description: "הזמנות שלא נשלחו עדיין לספקים",
          severity: "medium"
        });
      }

      return alertsList;
    } catch (error) {
      console.error("Error generating alerts:", error);
      return [];
    }
  }, [stats]);

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
          value={stats.totalRestaurants}
          description={`${stats.activeRestaurants} פעילות`}
          icon={Store}
          trend={{ value: Math.round((stats.activeRestaurants / stats.totalRestaurants) * 100), isPositive: true }}
        />
        <StatCard
          title="ספקים במערכת"
          value={stats.totalSuppliers}
          description={`${stats.totalProducts} מוצרים`}
          icon={Package}
          trend={{ value: Math.round((stats.totalProducts / stats.totalSuppliers) * 10), isPositive: true }}
        />
        <StatCard
          title="הזמנות סה״כ"
          value={stats.totalOrders}
          description={`${stats.pendingOrders} ממתינות`}
          icon={ShoppingCart}
          trend={{ value: stats.deliveredOrders > stats.pendingOrders ? 15 : -5, isPositive: stats.deliveredOrders > stats.pendingOrders }}
        />
        <StatCard
          title="שיחות פעילות"
          value={stats.activeConversations}
          description={`מתוך ${stats.totalConversations} שיחות`}
          icon={MessageSquare}
          trend={{ value: Math.round((stats.activeConversations / stats.totalConversations) * 100), isPositive: stats.activeConversations > 0 }}
        />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">פעילות אחרונה</TabsTrigger>
          <TabsTrigger value="alerts">התראות</TabsTrigger>
          {/* <TabsTrigger value="analytics">אנליטיקה</TabsTrigger> */}
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
                עדכונים אחרונים במערכת ({recentActivity.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  אין פעילות אחרונה
                </div>
              )}
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
                התראות שדורשות תשומת לב ({alerts.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        alert.severity === 'high' 
                          ? 'border-red-200 bg-red-50 dark:bg-red-950' 
                          : alert.severity === 'medium'
                          ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                          : 'border-blue-200 bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.severity === 'high' ? 'text-red-600' : 
                          alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">פעל</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  אין התראות פעילות
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  סטטיסטיקות מסעדות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">מסעדות פעילות</span>
                    <span className="text-sm font-medium">{stats.activeRestaurants}/{stats.totalRestaurants}</span>
                  </div>
                  <Progress value={(stats.activeRestaurants / stats.totalRestaurants) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">הזמנות שהועברו</span>
                    <span className="text-sm font-medium">{stats.deliveredOrders}/{stats.totalOrders}</span>
                  </div>
                  <Progress value={stats.totalOrders > 0 ? (stats.deliveredOrders / stats.totalOrders) * 100 : 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  סטטיסטיקות שיחות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">שיחות פעילות</span>
                    <span className="text-sm font-medium">{stats.activeConversations}/{stats.totalConversations}</span>
                  </div>
                  <Progress value={stats.totalConversations > 0 ? (stats.activeConversations / stats.totalConversations) * 100 : 0} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">בתהליך רישום</span>
                    <span className="text-sm font-medium">{stats.onboardingConversations}</span>
                  </div>
                  <Progress value={stats.totalConversations > 0 ? (stats.onboardingConversations / stats.totalConversations) * 100 : 0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent> */}

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
                {/* ...existing system status cards... */}
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">מסד נתונים</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      מחובר
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {stats.totalRestaurants} מסעדות, {stats.totalSuppliers} ספקים, {stats.totalConversations} שיחות
                  </div>
                  <Button variant="outline" size="sm" className="self-start mt-auto">
                    <a href="/raw-data">צפייה בנתונים</a>
                  </Button>
                </div>
                
                <div className="p-4 border rounded-md flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">פעילות הזמנות</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      פעיל
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.totalOrders} הזמנות סה״כ, {stats.pendingOrders} ממתינות
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

// Helper functions
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `לפני ${diffMinutes} דקות`;
  } else if (diffHours < 24) {
    return `לפני ${diffHours} שעות`;
  } else {
    return `לפני ${diffDays} ימים`;
  }
}

function getConversationAction(state: string): string {
  switch (state) {
    case "INVENTORY_SNAPSHOT_PRODUCT":
      return "בודק מלאי מוצרים";
    case "ONBOARDING_PAYMENT_METHOD":
      return "בתהליך רישום - תשלום";
    case "ORDER_CONFIRMATION":
      return "מאשר הזמנה";
    default:
      return "פעיל בשיחה";
  }
}
