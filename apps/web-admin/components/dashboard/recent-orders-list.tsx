"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// This would usually fetch data from Firestore
export function RecentOrdersList() {
  const loading = false;
  const orders = [
    {
      id: 'ORD-2025-001',
      supplier: 'Local Farms Ltd.',
      status: 'delivered',
      date: '2025-05-28',
      items: 12,
      restaurant: 'Olive Branch'
    },
    {
      id: 'ORD-2025-002',
      supplier: 'Sea Fresh Fish',
      status: 'sent',
      date: '2025-05-29',
      items: 8,
      restaurant: 'Olive Branch'
    },
    {
      id: 'ORD-2025-003',
      supplier: 'Vineyard Wines',
      status: 'pending',
      date: '2025-05-29',
      items: 5,
      restaurant: 'Sunset Grill'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">No recent orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center justify-between border-b pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{order.id}</span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-muted-foreground">{order.supplier} • {order.items} items</p>
            <p className="text-xs text-muted-foreground">Restaurant: {order.restaurant}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {order.date}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let variant = "outline";
  let label = status;

  switch (status) {
    case 'pending':
      variant = "outline";
      label = "Pending";
      break;
    case 'sent':
      variant = "secondary";
      label = "Sent";
      break;
    case 'delivered':
      variant = "default";
      label = "Delivered";
      break;
    case 'cancelled':
      variant = "destructive";
      label = "Cancelled";
      break;
  }

  return (
    <Badge variant={variant as any}>{label}</Badge>
  );
}
