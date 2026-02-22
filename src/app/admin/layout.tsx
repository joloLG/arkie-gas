'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Warehouse
} from "lucide-react";
import { createClient } from '@/utils/supabase/client';

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/sales", label: "Sales", icon: ShoppingCart },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/arkie-logo.png"
              alt="Arkie Gasul"
              width={48}
              height={48}
              className="object-contain"
            />
            <div>
              <span className="text-lg font-bold text-gray-900 leading-tight block">Arkie Gasul</span>
              <span className="text-xs text-gray-500">Admin Panel</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
                }`}
              >
                <link.icon className={`h-5 w-5 transition-colors ${active ? 'text-orange-500' : ''}`} />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/arkie-logo.png"
              alt="Arkie Gasul"
              width={36}
              height={36}
              className="object-contain"
            />
            <span className="text-lg font-bold text-gray-900">Arkie Gasul</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed top-[65px] left-0 bottom-0 w-72 bg-white z-25 transform transition-transform duration-300 ease-out shadow-xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 25 }}
      >
        <nav className="p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
                }`}
              >
                <link.icon className={`h-5 w-5 ${active ? 'text-orange-500' : ''}`} />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={() => { closeMobileMenu(); handleLogout(); }}
            className="flex items-center gap-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-6 md:p-8 animate-page-in">
          {children}
        </div>
      </main>
    </div>
  );
}
