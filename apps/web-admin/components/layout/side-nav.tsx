"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  HomeIcon, 
  PackageIcon, 
  ShoppingCartIcon, 
  ClipboardListIcon, 
  SettingsIcon, 
  LogOutIcon,
  MenuIcon,
  XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/lib/firebaseClient";
import { useState } from "react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
}

function NavItem({ href, icon, title }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
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
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <>
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        {isOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </Button>
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b">
            <h1 className="text-lg font-semibold">WhatsApp Inventory Bot</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <NavItem 
              href="/" 
              icon={<HomeIcon size={16} />} 
              title="Dashboard" 
            />
            <NavItem 
              href="/suppliers" 
              icon={<PackageIcon size={16} />} 
              title="Suppliers" 
            />
            <NavItem 
              href="/orders" 
              icon={<ShoppingCartIcon size={16} />} 
              title="Orders" 
            />
            <NavItem 
              href="/inventory" 
              icon={<ClipboardListIcon size={16} />} 
              title="Inventory" 
            />
            <NavItem 
              href="/settings" 
              icon={<SettingsIcon size={16} />} 
              title="Settings" 
            />
          </nav>
          
          {/* User & Logout */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={() => signOut()}
            >
              <LogOutIcon size={16} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
