'use client';

import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  PackageOpen, 
  ShoppingCart, 
  TrendingUp,
  Loader2,
  Users,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import Link from 'next/link';
import { db } from '@/lib/db-complete';
import { useOptimizedData, fetchParallel } from '@/hooks/useOptimizedData';
import { StatCardSkeleton, CardSkeleton } from '@/components/ui/Skeleton';

interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  totalCredit: number;
  totalTanks: number;
  availableTanks: number;
}

export default function AdminDashboard() {
  const { data: stats, loading, error, refetch } = useOptimizedData(
    'dashboard-stats',
    async () => {
      const result = await db.analytics.getDashboardStats();
      return { data: result };
    },
    []
  );

  if (loading) {
    return (
      <div className="p-6 md:p-8 animate-page-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <CardSkeleton count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 animate-page-in">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600">Please try refreshing the page or contact support.</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Today's Sales",
      value: `₱${(stats?.todaySales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      description: "Total sales today",
    },
    {
      title: "Today's Profit",
      value: `₱${(stats?.todayProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
      description: "Profit earned today",
    },
    {
      title: "Total Credit",
      value: `₱${(stats?.totalCredit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      color: 'bg-orange-100 text-orange-600',
      description: "Outstanding customer credit",
    },
    {
      title: "Available Tanks",
      value: stats?.availableTanks || 0,
      icon: PackageOpen,
      color: 'bg-purple-100 text-purple-600',
      description: "Total tanks ready for sale",
    },
  ];

  const quickActions = [
    {
      title: "Record Sale",
      description: "Add a new sale transaction",
      icon: ShoppingCart,
      href: "/admin/record-sale",
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      title: "Sales Tracking",
      description: "View sales reports and analytics",
      icon: TrendingUp,
      href: "/admin/sales-tracking",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Inventory",
      description: "Manage products and stock",
      icon: PackageOpen,
      href: "/admin/inventory",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Customer Credits",
      description: "Manage customer loans",
      icon: Users,
      href: "/admin/customer-credits",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Main Dashboard</h1>
        <p className="text-gray-600">Welcome to Arkie Gasul Management System</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm animate-slide-up stagger-{index + 1}">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.title}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Available Tanks Summary */}
      <div className="bg-linear-to-r from-orange-500 to-orange-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Available Tanks</h3>
            <p className="text-3xl font-bold">{stats?.availableTanks || 0}</p>
            <p className="text-orange-100 text-sm mt-1">Total tanks ready for sale</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <PackageOpen className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={action.title}
            href={action.href}
            className="group"
          >
            <div className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-up stagger-${index + 5}`}>
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Database Connected</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">All Systems Operational</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
