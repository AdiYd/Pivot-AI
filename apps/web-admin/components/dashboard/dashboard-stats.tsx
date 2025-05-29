"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, PackageIcon, TruckIcon, AlertCircleIcon } from "lucide-react";

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard 
        title="Active Restaurants" 
        value="2"
        description="Total active restaurants"
        icon={<UsersIcon className="h-4 w-4 text-muted-foreground" />}
        trend="0%"
      />
      <StatsCard 
        title="Suppliers" 
        value="8"
        description="Total active suppliers"
        icon={<PackageIcon className="h-4 w-4 text-muted-foreground" />}
        trend="+2.5%"
        trendUp={true}
      />
      <StatsCard 
        title="Orders This Week" 
        value="14"
        description="Total orders processed"
        icon={<TruckIcon className="h-4 w-4 text-muted-foreground" />}
        trend="+10.2%"
        trendUp={true}
      />
      <StatsCard 
        title="Shortages" 
        value="3"
        description="Product shortage incidents"
        icon={<AlertCircleIcon className="h-4 w-4 text-muted-foreground" />}
        trend="-5.1%"
        trendUp={false}
      />
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend: string;
  trendUp?: boolean;
}

function StatsCard({ title, value, description, icon, trend, trendUp }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className={`text-xs mt-2 ${trendUp ? 'text-green-600' : trendUp === false ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend} from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
