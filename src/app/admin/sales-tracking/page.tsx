'use client';

import { useEffect, useState } from 'react';
import { Download, Calendar, Loader2, TrendingUp, TrendingDown, DollarSign, PackageOpen, Users } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { db } from '@/lib/db-complete';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

interface SaleWithDetails {
  id: string;
  customer_name: string | null;
  brand: string | null;
  product_name: string | null;
  payment_type: 'cash' | 'credit';
  base_price: number;
  customer_price: number;
  profit: number;
  quantity: number;
  empty_tanks_returned: number;
  sold_at: string;
}

export default function SalesTrackingPage() {
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

  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      
      // Calculate date range based on filter type
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (filterType) {
        case 'month':
          const [year, month] = selectedMonth.split('-').map(Number);
          start = new Date(year, month - 1, 1);
          end = new Date(year, month, 0);
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

      // Load sales and analytics data
      const [salesResult, monthlyResult, yearlyResult] = await Promise.all([
        db.sales.getAll(startIso, endIso),
        db.analytics.getMonthlySummary(),
        db.analytics.getYearlySummary(),
      ]);

      if (!cancelled) {
        setSales((salesResult.data as SaleWithDetails[]) || []);
        setMonthlyData((monthlyResult.data as any[]) || []);
        setYearlyData((yearlyResult.data as any[]) || []);
        setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [filterType, selectedMonth, selectedYear, selectedDay, startDate, endDate]);

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + sale.customer_price * sale.quantity, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalLoans = sales
    .filter(sale => sale.payment_type === 'credit')
    .reduce((sum, sale) => sum + sale.customer_price * sale.quantity, 0);
  const totalTransactions = sales.length;

  // Chart data
  const salesChartData = {
    labels: monthlyData.slice(0, 12).map(d => new Date(d.sale_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Sales',
        data: monthlyData.slice(0, 12).map(d => d.total_sales),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderColor: 'rgb(251, 146, 60)',
        borderWidth: 1,
      },
      {
        label: 'Profit',
        data: monthlyData.slice(0, 12).map(d => d.total_profit),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const growthChartData = {
    labels: yearlyData.map(d => new Date(d.sale_year).getFullYear()),
    datasets: [
      {
        label: 'Sales Growth',
        data: yearlyData.map(d => d.total_sales),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Profit Growth',
        data: yearlyData.map(d => d.total_profit),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Customer Name', 'Brand', 'Product', 'Payment Type', 'Base Price', 'Customer Price', 'Profit', 'Returned Empty Tank'];
    const csvData = sales.map(sale => [
      new Date(sale.sold_at).toLocaleString('en-PH'),
      sale.customer_name || 'Walk-in Customer',
      sale.brand || 'N/A',
      sale.product_name || 'Unknown',
      sale.payment_type === 'credit' ? 'Credit' : 'Cash',
      `₱${sale.base_price.toFixed(2)}`,
      `₱${sale.customer_price.toFixed(2)}`,
      `₱${sale.profit.toFixed(2)}`,
      sale.empty_tanks_returned.toString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Tracking</h1>
        <p className="text-gray-600">Monitor sales performance and analytics</p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="month">This Month</option>
              <option value="day">Today</option>
              <option value="year">This Year</option>
              <option value="range">Custom Range</option>
            </select>
          </div>

          {filterType === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}

          {filterType === 'day' && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}

          {filterType === 'year' && (
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Year"
            />
          )}

          {filterType === 'range' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-linear-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Sales</p>
                <p className="text-2xl font-bold">₱{totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </div>

          <div className="bg-linear-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Profit</p>
                <p className="text-2xl font-bold">₱{totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-linear-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Loans</p>
                <p className="text-2xl font-bold">₱{totalLoans.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <Users className="h-8 w-8 text-orange-200" />
            </div>
          </div>

          <div className="bg-linear-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Transactions</p>
                <p className="text-2xl font-bold">{totalTransactions}</p>
              </div>
              <PackageOpen className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales & Profit</h3>
          <div className="h-80">
            <Bar data={salesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yearly Growth Trends</h3>
          <div className="h-80">
            <Line data={growthChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Sales Details</h3>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Brand</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Payment Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Base Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Profit</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Returned Empty Tank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No sales found for the selected period.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(sale.sold_at).toLocaleDateString('en-PH')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.brand || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.product_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.payment_type === 'credit'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {sale.payment_type === 'credit' ? 'Credit' : 'Cash'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₱{sale.base_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₱{sale.customer_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">
                      ₱{sale.profit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.empty_tanks_returned}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
