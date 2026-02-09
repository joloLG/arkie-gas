'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Calendar } from 'lucide-react';

interface ProductAnalytics {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  transaction_count: number;
  price_changes: number;
  avg_unit_price: number;
}

interface PriceChange {
  product_name: string;
  old_price: number;
  new_price: number;
  changed_at: string;
  percentage_change: number;
}

const sampleAnalytics: ProductAnalytics[] = [
  { 
    product_id: '1', 
    product_name: '11kg LPG Tank', 
    total_quantity_sold: 45, 
    total_revenue: 38700.00, 
    transaction_count: 28,
    price_changes: 2,
    avg_unit_price: 860.00
  },
  { 
    product_id: '2', 
    product_name: '5kg LPG Tank', 
    total_quantity_sold: 32, 
    total_revenue: 14720.00, 
    transaction_count: 22,
    price_changes: 1,
    avg_unit_price: 460.00
  },
  { 
    product_id: '3', 
    product_name: '2.7kg LPG Tank', 
    total_quantity_sold: 18, 
    total_revenue: 6300.00, 
    transaction_count: 12,
    price_changes: 0,
    avg_unit_price: 350.00
  },
];

const samplePriceChanges: PriceChange[] = [
  { product_name: '11kg LPG Tank', old_price: 850.00, new_price: 900.00, changed_at: '2026-02-05T10:00:00', percentage_change: 5.88 },
  { product_name: '11kg LPG Tank', old_price: 800.00, new_price: 850.00, changed_at: '2026-01-15T09:00:00', percentage_change: 6.25 },
  { product_name: '5kg LPG Tank', old_price: 450.00, new_price: 480.00, changed_at: '2026-02-01T14:00:00', percentage_change: 6.67 },
];

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Calculate totals
  const totalRevenue = sampleAnalytics.reduce((sum, p) => sum + p.total_revenue, 0);
  const totalQuantity = sampleAnalytics.reduce((sum, p) => sum + p.total_quantity_sold, 0);
  const totalTransactions = sampleAnalytics.reduce((sum, p) => sum + p.transaction_count, 0);
  
  // Sort by quantity sold for most popular
  const mostPopularProducts = [...sampleAnalytics].sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
  
  // Sort by revenue for top revenue
  const topRevenueProducts = [...sampleAnalytics].sort((a, b) => b.total_revenue - a.total_revenue);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h1>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'month', 'year'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  dateRange === range
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === 'today' ? 'Today' : `This ${range}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">Feb 1 - Feb 9, 2026</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Units Sold</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Transactions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Avg. Order Value</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₱{(totalRevenue / totalTransactions).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most Popular Products */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Most Popular Products</h2>
            <p className="text-sm text-gray-500">Top selling products by quantity</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mostPopularProducts.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.product_name}</p>
                      <p className="text-sm text-gray-500">{product.transaction_count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.total_quantity_sold} units</p>
                    <p className="text-sm text-gray-500">
                      ₱{product.total_revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Revenue Products */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Revenue Generators</h2>
            <p className="text-sm text-gray-500">Products with highest revenue</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topRevenueProducts.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.product_name}</p>
                      <p className="text-sm text-gray-500">Avg. ₱{product.avg_unit_price.toFixed(2)}/unit</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₱{product.total_revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">{product.total_quantity_sold} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Price History Changes */}
      <div className="mt-6 bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Price Changes</h2>
          <p className="text-sm text-gray-500">Historical price adjustments affecting revenue calculations</p>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Old Price</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">New Price</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Change</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {samplePriceChanges.map((change, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{change.product_name}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">₱{change.old_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₱{change.new_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      change.percentage_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {change.percentage_change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(change.percentage_change).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(change.changed_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Price History Algorithm:</strong> Sales are calculated using the price at the time of each transaction. 
            When a product price changes from ₱50 to ₱55, only new sales use the new price. Previous 10 sales at ₱50 remain at ₱500 total, 
            ensuring accurate historical revenue reporting regardless of current pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
