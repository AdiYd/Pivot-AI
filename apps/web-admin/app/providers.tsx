"use client";

import { ReactNode } from "react";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { FirebaseAppProvider } from "@/lib/firebaseClient";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FirebaseAppProvider } from "@/lib/firebaseClient";

// Create a client
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       retry: 1,
//       refetchOnWindowFocus: false,
//     },
//   },
// });

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* <QueryClientProvider client={queryClient}> */}
        <TooltipProvider>
          <FirebaseAppProvider>
            {children}
          </FirebaseAppProvider>
        </TooltipProvider>
      {/* </QueryClientProvider> */}
    </ThemeProvider>
  );
}
