"use client";

import { useFirebase } from "@/lib/firebaseClient";

export function DashboardHeader() {
  const { user } = useFirebase();
  
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome {user?.email ? user.email.split('@')[0] : 'back'} to your inventory management system.
      </p>
    </div>
  );
}
