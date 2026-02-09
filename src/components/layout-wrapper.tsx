'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide navbar and footer on auth and admin pages
  const hideNavFooter = pathname === '/login' || 
                        pathname === '/register' || 
                        pathname?.startsWith('/admin');

  return (
    <>
      {!hideNavFooter && <Navbar />}
      {children}
      {!hideNavFooter && <Footer />}
    </>
  );
}
