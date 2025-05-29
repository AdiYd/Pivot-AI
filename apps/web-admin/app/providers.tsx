"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FirebaseAppProvider } from "@/lib/firebaseClient";

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAppProvider>
        {children}
      </FirebaseAppProvider>
    </QueryClientProvider>
  );
}
