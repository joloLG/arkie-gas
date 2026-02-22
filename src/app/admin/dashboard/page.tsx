'use client';

import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  Loader2
} from "lucide-react";
import Link from 'next/link';
import { db, type Product, type Sale } from '@/lib/db';

interface SaleWithProduct extends Sale {
  products: { name: string } | null;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<SaleWithProduct[]>([]);
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [todayQuantity, setTodayQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setNow(Date.now());

      // Fetch products
      const { data: productsData } = await db.products.getAll();
      const allProducts = (productsData as Product[]) || [];
      setProducts(allProducts);

      // Fetch today's sales
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const { data: salesData } = await db.sales.getAll(startOfDay, endOfDay);
      const todaySales = (salesData as SaleWithProduct[]) || [];

      setTodaySalesTotal(todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0));
      setTodayQuantity(todaySales.reduce((sum, s) => sum + s.quantity, 0));

      // Fetch recent 10 sales (no date filter)
      const { data: recentData } = await db.sales.getAll();
      setRecentSales(((recentData as SaleWithProduct[]) || []).slice(0, 8));

      setLoading(false);
    }
    fetchData();
  }, []);

  const lowStockItems = products.filter(p => p.stock_quantity < 10 && p.is_active);

  const stats = [
    {
      title: "Total Sales Today",
      value: `₱${todaySalesTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: "Products Sold Today",
      value: `${todayQuantity}`,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: "Total Products",
      value: `${products.filter(p => p.is_active).length}`,
      icon: Package,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: "Low Stock Items",
      value: `${lowStockItems.length}`,
      icon: TrendingUp,
      color: 'bg-red-100 text-red-600',
    },
  ];

  function timeAgo(dateStr: string) {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={stat.title} className={`bg-white rounded-xl p-6 shadow-sm animate-slide-up stagger-${index + 1}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm animate-slide-up stagger-5">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
          </div>
          <div className="p-6">
            {recentSales.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{sale.products?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{sale.quantity} item(s) • {timeAgo(sale.sold_at)}</p>
                    </div>
                    <span className="font-semibold text-gray-900">₱{Number(sale.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm animate-slide-up stagger-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/products/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <Package className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Add Product</span>
              </Link>
              <Link 
                href="/admin/sales/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <ShoppingCart className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Record Sale</span>
              </Link>
              <Link 
                href="/admin/inventory" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <TrendingUp className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">View Inventory</span>
              </Link>
              <Link 
                href="/admin/analytics" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <DollarSign className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">View Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
