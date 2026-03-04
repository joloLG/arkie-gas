'use client';

import { useEffect, useState } from 'react';
import { Plus, Calendar, Download, Loader2, Users, PackageOpen, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { db, type Sale } from '@/lib/db';

interface SaleWithProduct extends Sale {
  products: { name: string; brand: string | null } | null;
  customers: { name: string } | null;
}

export default function SalesPage() {
  const [filterType, setFilterType] = useState<'month' | 'range' | 'day' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // Calculate date range based on filter type
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (filterType) {
        case 'month':
          const [year, month] = selectedMonth.split('-').map(Number);
          start = new Date(year, month - 1, 1);
          end = new Date(year, month, 0); // Last day of month
          break;
        case 'range':
          start = new Date(startDate);
          end = new Date(endDate);
          break;
        case 'day':
          start = new Date(selectedDay);
          end = new Date(selectedDay);
          break;
        case 'year':
          start = new Date(parseInt(selectedYear), 0, 1);
          end = new Date(parseInt(selectedYear), 11, 31);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const startIso = start.toISOString();
      const endIso = end.toISOString().replace('T23:59:59.999Z', 'T23:59:59.999Z');
      const { data } = await db.sales.getAll(startIso, endIso);
      if (!cancelled) {
        setSales((data as SaleWithProduct[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filterType, selectedMonth, selectedYear, selectedDay, startDate, endDate]);

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const transactionCount = sales.length;
  const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
  const creditSales = sales.filter(sale => sale.sale_type === 'credit');
  const cashSales = sales.filter(sale => sale.sale_type === 'cash');
  const totalEmptyTanksBorrowed = sales.reduce((sum, sale) => sum + (sale.empty_tanks_borrowed || 0), 0);
  const totalEmptyTanksReturned = sales.reduce((sum, sale) => sum + (sale.empty_tanks_returned || 0), 0);

  const exportToCSV = () => {
    const headers = ['Date & Time', 'Customer', 'Product', 'Brand', 'Payment Type', 'Qty', 'Unit Price', 'Total', 'Profit', 'Empty Tanks'];
    const csvData = sales.map(sale => [
      new Date(sale.sold_at).toLocaleString('en-PH'),
      sale.customers?.name || (sale.notes?.includes('Customer:') ? sale.notes.split('Customer:')[1]?.trim() : 'Cash Sale'),
      sale.products?.name || 'Unknown',
      sale.products?.brand || 'N/A',
      sale.sale_type === 'credit' ? 'Credit' : 'Cash',
      sale.quantity,
      `₱${Number(sale.unit_price).toFixed(2)}`,
      `₱${Number(sale.total_amount).toFixed(2)}`,
      `₱${Number(sale.profit || 0).toFixed(2)}`,
      `${sale.empty_tanks_borrowed || 0} borrowed / ${sale.empty_tanks_returned || 0} returned`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-page-in">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Sales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₱{totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PackageOpen className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total Profit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₱{totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Credit Sales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{creditSales.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Empty Tanks</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalEmptyTanksBorrowed - totalEmptyTanksReturned} out
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filter Type */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'month' | 'range' | 'day' | 'year')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="month">Month</option>
              <option value="range">Range</option>
              <option value="day">Day</option>
              <option value="year">Year</option>
            </select>
          </div>

          {/* Conditional Date Inputs */}
          {filterType === 'month' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {filterType === 'range' && (
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
          )}

          {filterType === 'day' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {filterType === 'year' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2000"
                max={new Date().getFullYear() + 1}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-24"
                placeholder="Year"
              />
            </div>
          )}

          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 ml-auto"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date & Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Brand</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Payment</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Qty</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Unit Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Profit</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Empty Tanks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <span className="block">
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
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <span className="block">
                          {sale.customers?.name || (sale.notes?.includes('Customer:') ? sale.notes.split('Customer:')[1]?.trim() : 'Cash Sale')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <span className="block">
                          {sale.products?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          ({sale.products?.brand || 'N/A'})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="block">
                        ({sale.products?.brand || 'N/A'})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                        sale.sale_type === 'credit' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {sale.sale_type === 'credit' ? 'Credit' : 'Cash'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{sale.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">₱{Number(sale.unit_price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      <span className="font-semibold">₱{Number(sale.total_amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      <span className={`font-medium ${
                        Number(sale.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₱{Number(sale.profit || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <PackageOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-900">
                          {sale.empty_tanks_borrowed || 0}B / {sale.empty_tanks_returned || 0}R
                        </span>
                        {(sale.empty_tanks_borrowed || 0) > (sale.empty_tanks_returned || 0) && (
                          <AlertCircle className="h-4 w-4 text-orange-500 ml-2" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sales.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No sales found for the selected date range.
              </div>
            )}
          </>
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
