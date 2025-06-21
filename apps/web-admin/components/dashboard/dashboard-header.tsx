"use client";

import { useSession } from "next-auth/react";

export function DashboardHeader() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome {user?.email ? user.email.split('@')[0] : 'back'} to your inventory management system.
      </p>
    </div>
  );
}
