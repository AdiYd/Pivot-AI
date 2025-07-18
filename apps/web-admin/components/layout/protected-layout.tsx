"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SideNav } from "@/components/layout/side-nav";
import { Loader2 } from "lucide-react";
import { Button } from "../ui";
import { useFirebase } from "@/lib/firebaseClient";
import { Icon } from "@iconify/react/dist/iconify.js";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const {toggleSource, source} = useFirebase();

  // Define public routes that don't need protection
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/snapshots/') ||
   (pathname.startsWith('/orders/') && pathname !== '/orders/') || (pathname.startsWith('/contacts/'));

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicRoute) {
      router.push("/login");
    }
  }, [status, router, isPublicRoute]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" && !isPublicRoute) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      {/* Background gradients for visual appeal */}
     {!isPublicRoute &&
      <> 
        <div className="fixed top-[-130px] left-[-210px] overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-green-500/30 to-orange-400/70 blur-[150px] z-0" />
        <div className="fixed -top-1/4 left-0 hidden max-sm:block overflow-hidden w-[40vw] max-sm:w-[20vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-green-500/30 to-orange-400/60 blur-[100px] z-0" />
      </>}
        <div className="fixed bottom-[-130px] right-[-210px] overflow-hidden w-[40vw] max-sm:w-[44vw] h-[20vh] max-sm:h-2/3 rounded-full bg-gradient-to-r filter from-blue-400/90 to-purple-400-500/80 dark:from-blue-400/80 dark:to-purple-600/70 blur-[100px] z-0" />
      
      <div className="flex min-h-screen relative">
        {!isPublicRoute && <SideNav />}
        {!isPublicRoute && pathname !== '/simulator' &&
        <Button
        title={!source ? "מעבר לנתוני סימולטור": "מעבר לנתוני אמת (וואטצאפ)"}
        variant="outline"
        size={"icon"}
        className={`absolute bottom-4 hover:scale-110 left-4 shadow-lg shadow-teal-500 hover:shadow-pink-400 rounded-xl ${ !source ? 'bg-orange-500/80' : 'bg-green-400/80'} backdrop-blur-xl hover:bg-teal-500/80 transition-all duration-500 z-[99999]`}
        onClick={toggleSource}
      >
        <Icon icon="carbon:debug"  />
      </Button>}
        <main className="flex-1 p-6 max-sm:p-4 max-sm:pt-10 overflow-auto max-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}