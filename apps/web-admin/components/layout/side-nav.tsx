"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Avatar from "boring-avatars"
import { 
  Package, 
  ShoppingCart, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut, useSession } from "next-auth/react"; // Import NextAuth signOut and useSession
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@iconify/react/dist/iconify.js";
import { PivotAvatar } from "../ui";
import Image from "next/image";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  isCollapsed: boolean;
}

type AvatarVariant = 'beam' | 'marble' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';

const getRandomAvatarVariant = (): AvatarVariant => {
  const variants = ['beam', 'marble', 'pixel', 'sunset', 'ring', 'bauhaus'];
  return variants[Math.floor(Math.random() * variants.length)] as AvatarVariant;
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
  // Use NextAuth session instead of Firebase
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
 
  const userAvatar = useMemo(() => {
    if (session && session.user?.image) {
      return (
        <Image
          src={session.user.image}
          alt="User Avatar"
          width={24}
          height={24}
          className="rounded-full"
        />
      );
    }
    return (
      <Avatar
        size={24}
        name={session?.user?.name || session?.user?.email || 'user'}
        variant={getRandomAvatarVariant()} // Use a random variant
        colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
      />
    );
  }, [session]);

  // Handle logout with NextAuth
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };
  
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
        className="fixed top-4 left-4 bg-gray-200 dark:bg-gray-900 z-50 lg:hidden"
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
        <div className="flex flex-col h-full bg-stone-100/60 dark:bg-stone-900/60 backdrop-blur-xl">
          
          {/* Logo area */}
          <div className={cn(
            "h-16 flex items-center px-2",
            isCollapsed ? "justify-center" : "justify-between px-4"
            )}>
            {!isCollapsed && 
            <div className="flex items-center gap-1 ml-2">
              <PivotAvatar />
              <h3 className="mr-2 font-semibold text-sm truncate">P-vot</h3>
            </div>}
            <div className="flex items-center gap-2">
              {!isCollapsed && <ThemeToggle />}
              <Button variant="ghost" size="icon" onClick={toggleCollapse} className="flex-shrink-0">
                {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </Button>
            </div>
          </div>

          {/* User info when not collapsed */}
          {!isCollapsed && session && (
            <div className="flex border-b items-center gap-2 mb-3 p-2 rounded-md">
              {userAvatar}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user?.name || session.user?.email?.split('@')[0]}
                </p>
                {session.user?.email && session.user.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                )}
              </div>
            </div>
          )}
          
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
            </div>
          </nav>
          
          {/* User & Logout */}
          <div className={cn(
            "border-t border-zinc-400/40",
            isCollapsed ? "p-2 mx-auto" : "p-4"
          )}>
           
            
            {isCollapsed ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleLogout}
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
                onClick={handleLogout}
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
            <div className="flex items-center gap-2">
              <PivotAvatar style={{display:'block'}}  />
              <h3 className="font-semibold text-sm truncate">P-vot</h3>
            </div>
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
          </nav>
          
          {/* User & Logout for mobile */}
          <div className="p-4 border-t space-y-3">
            {/* User info */}
            {session && (
              <div className="flex items-center gap-2 p-2 rounded-md">
                {userAvatar}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user?.name || session.user?.email?.split('@')[0]}
                  </p>
                  {session.user?.email && session.user.name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={handleLogout}
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
