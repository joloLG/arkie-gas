'use client';

import { useState } from 'react';
import { Plus, Calendar, Filter, Download } from 'lucide-react';
import Link from 'next/link';

interface Sale {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sold_at: string;
}

// Sample sales data showing price history in action
const sampleSales: Sale[] = [
  // Product 1: 11kg LPG Tank - price was 50, then changed to 55
  { id: '1', product_name: '11kg LPG Tank', quantity: 5, unit_price: 850.00, total_amount: 4250.00, sold_at: '2026-02-09T10:00:00' },
  { id: '2', product_name: '11kg LPG Tank', quantity: 3, unit_price: 850.00, total_amount: 2550.00, sold_at: '2026-02-09T11:30:00' },
  { id: '3', product_name: '11kg LPG Tank', quantity: 2, unit_price: 900.00, total_amount: 1800.00, sold_at: '2026-02-09T14:00:00' }, // Price increased
  { id: '4', product_name: '11kg LPG Tank', quantity: 4, unit_price: 900.00, total_amount: 3600.00, sold_at: '2026-02-09T16:00:00' },
  
  // Product 2: 5kg LPG Tank
  { id: '5', product_name: '5kg LPG Tank', quantity: 2, unit_price: 450.00, total_amount: 900.00, sold_at: '2026-02-09T09:00:00' },
  { id: '6', product_name: '5kg LPG Tank', quantity: 1, unit_price: 480.00, total_amount: 480.00, sold_at: '2026-02-09T13:00:00' }, // Price increased
  
  // Yesterday's sales
  { id: '7', product_name: '11kg LPG Tank', quantity: 8, unit_price: 850.00, total_amount: 6800.00, sold_at: '2026-02-08T15:00:00' },
  { id: '8', product_name: '2.7kg LPG Tank', quantity: 3, unit_price: 350.00, total_amount: 1050.00, sold_at: '2026-02-08T12:00:00' },
];

type ViewMode = 'daily' | 'range' | 'monthly' | 'yearly';

export default function SalesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState('2026-02-09');
  const [sales] = useState<Sale[]>(sampleSales);

  // Calculate totals based on actual unit_price at time of sale (price snapshot)
  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const transactionCount = sales.length;

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sold_at);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return saleDate >= start && saleDate <= end;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <Link
          href="/admin/sales/new"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Record Sale
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900">₱{totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900">{totalQuantity} units</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{transactionCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['daily', 'range', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 ml-auto">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date & Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Qty</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Unit Price</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {new Date(sale.sold_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    {new Date(sale.sold_at).toLocaleTimeString('en-PH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{sale.product_name}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-gray-900">{sale.quantity}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-gray-900">₱{sale.unit_price.toFixed(2)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-gray-900">₱{sale.total_amount.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sales found for the selected date range.
          </div>
        )}
      </div>

      {/* Price History Note */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Sales totals are calculated using the price at the time of sale. 
          When product prices change, historical sales retain their original unit price, ensuring accurate revenue reporting.
        </p>
      </div>
    </div>
  );
}
