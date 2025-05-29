import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentOrdersList } from "@/components/dashboard/recent-orders-list";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      <DashboardStats />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              View and manage recent orders from suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentOrdersList />
          </CardContent>
          <CardFooter>
            <Link href="/orders" passHref>
              <Button variant="outline" className="w-full">View All Orders</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Inventory Checks</CardTitle>
            <CardDescription>
              Scheduled inventory reminders for the next 48 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Inventory reminders will appear here once you have set up suppliers.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/suppliers" passHref>
              <Button variant="outline" className="w-full">Manage Suppliers</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
