"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  MessageSquare,
  Settings,
  Database,
  Workflow,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFirebase } from "@/lib/firebaseClient";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@iconify/react/dist/iconify.js";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  isCollapsed: boolean;
}

function NavItem({ href, icon, title, isCollapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              href={href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md p-2 text-sm transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              {icon}
              <span className="sr-only">{title}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-1">
            {title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-muted"
      )}
    >
      {icon}
      <span>{title}</span>
    </Link>
  );
}

export function SideNav() {
  const { signOut } = useFirebase();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Check if we're on mobile when component mounts
  useEffect(() => {
    const checkIfMobile = () => {
      setIsCollapsed(window.innerWidth < 1024 ? false : isCollapsed);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [isCollapsed]);
  
  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <>
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleMobileSidebar}
        className="fixed top-4 left-4 bg-zinc-200 dark:bg-zinc-800 z-50 lg:hidden"
      >
        {isMobileOpen ? <X size={15} /> : <Menu size={15} />}
      </Button>
      
      {/* Sidebar for desktop */}
      <motion.div 
        initial={{ width: isCollapsed ? 80 : 200 }}
        animate={{ width: isCollapsed ? 60 : 200 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "hidden lg:block h-screen border-l z-30 relative",
        )}
      >
        <div className="flex flex-col h-full bg-zinc-200/20 dark:bg-zinc-800/20 backdrop-blur-sm">
          {/* Logo area */}
          <div className={cn(
            "h-16 flex items-center border-b px-2",
            isCollapsed ? "justify-center" : "justify-between px-6"
          )}>
            {!isCollapsed && <h1 className="text-lg font-semibold truncate">Pivot</h1>}
            <div className="flex items-center gap-2">
              {!isCollapsed && <ThemeToggle />}
              <Button variant="ghost" size="icon" onClick={toggleCollapse} className="flex-shrink-0">
                {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className={cn(
            "flex-1 py-6 overflow-y-auto",
            isCollapsed ? "px-1 mx-auto" : "px-4"
          )}>
            <div className="space-y-2">
              <NavItem 
                href="/" 
                icon={<Home size={16} />} 
                title="דף הבית"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/restaurants" 
                icon={<Icon icon='ic:baseline-restaurant' width={16} height={16} />}
                title="מסעדות"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/suppliers" 
                icon={<Package size={16} />} 
                title="ספקים"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/orders" 
                icon={<ShoppingCart size={16} />} 
                title="הזמנות"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/conversations" 
                icon={<MessageSquare size={16} />}
                title="שיחות"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/simulator" 
                icon={<Icon icon='ic:baseline-whatsapp' width={16} height={16} />}
                title="סימולטור צ'אט"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/workflow" 
                icon={<Workflow size={16} />} 
                title="Chatbot flow"
                isCollapsed={isCollapsed}
              />
              <NavItem 
                href="/bot-config" 
                icon={<Settings size={16} />} 
                title="הגדרות"
                isCollapsed={isCollapsed}
              />
              {/* <NavItem 
                href="/raw-data" 
                icon={<Database size={16} />} 
                title="נתונים גולמיים"
                isCollapsed={isCollapsed}
              /> */}
            </div>
          </nav>
          
          {/* User & Logout */}
          <div className={cn(
            "border-t",
            isCollapsed ? "p-2 mx-auto" : "p-4"
          )}>
            {isCollapsed ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => signOut()}
                    >
                      <LogOut size={16} />
                      <span className="sr-only">התנתק</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="mr-1">
                    התנתק
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => signOut()}
              >
                <LogOut size={16} />
                <span>התנתק</span>
              </Button>
            )}
            
            {isCollapsed && (
              <div className="flex justify-center mt-2">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Sidebar for mobile */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: isMobileOpen ? "0%" : "100%" }}
        transition={{ duration: 0.2 }}
        className="fixed inset-y-0 right-0 z-40 w-64 bg-background border-l lg:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b">
            <h1 className="text-lg font-semibold">Pivot</h1>
            <ThemeToggle />
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <NavItem 
              href="/" 
              icon={<Home size={16} />} 
              title="דף הבית"
              isCollapsed={false}
            />
            <NavItem 
              href="/restaurants" 
              icon={<Icon icon='ic:baseline-restaurant' width={16} height={16} />}
              title="מסעדות" 
              isCollapsed={false}
            />
            <NavItem 
              href="/suppliers" 
              icon={<Package size={16} />} 
              title="ספקים" 
              isCollapsed={false}
            />
            <NavItem 
              href="/orders" 
              icon={<ShoppingCart size={16} />} 
              title="הזמנות" 
              isCollapsed={false}
            />
            <NavItem 
              href="/conversations" 
              icon={<MessageSquare size={16} />}
              title="שיחות" 
              isCollapsed={false}
            />
            <NavItem 
              href="/simulator" 
              icon={<Icon icon='ic:baseline-whatsapp' width={16} height={16} />}
              title="סימולטור צ'אט" 
              isCollapsed={false}
            />
            <NavItem 
              href="/workflow" 
              icon={<Workflow size={16} />} 
              title="Chatbot flow"
              isCollapsed={false}
            />
            <NavItem 
              href="/bot-config" 
              icon={<Settings size={16} />} 
              title="הגדרות" 
              isCollapsed={false}
            />
            <NavItem 
              href="/raw-data" 
              icon={<Database size={16} />} 
              title="נתונים גולמיים" 
              isCollapsed={false}
            />
          </nav>
          
          {/* User & Logout */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={() => signOut()}
            >
              <LogOut size={16} />
              <span>התנתק</span>
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
