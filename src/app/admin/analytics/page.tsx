'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Loader2 } from 'lucide-react';
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
import { db } from '@/lib/db';

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

interface MostBoughtProduct {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  transaction_count: number;
}

interface PriceChangeDetailed {
  id: string;
  product_id: string;
  product_name: string;
  old_price: number;
  new_price: number;
  changed_at: string;
  price_difference: number;
  percentage_change: number;
}

export default function AnalyticsPage() {
  const [popularProducts, setPopularProducts] = useState<MostBoughtProduct[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChangeDetailed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [productsRes, priceRes] = await Promise.all([
        db.analytics.getMostBoughtProducts(10),
        db.priceHistory.getAll(),
      ]);
      setPopularProducts((productsRes.data as MostBoughtProduct[]) || []);
      setPriceChanges(((priceRes.data as PriceChangeDetailed[]) || []).slice(0, 10));
      setLoading(false);
    }
    loadData();
  }, []);

  const totalRevenue = popularProducts.reduce((sum, p) => sum + Number(p.total_revenue), 0);
  const totalQuantity = popularProducts.reduce((sum, p) => sum + Number(p.total_quantity_sold), 0);
  const totalTransactions = popularProducts.reduce((sum, p) => sum + Number(p.transaction_count), 0);

  const topRevenueProducts = [...popularProducts].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));

  // Prepare chart data
  const popularProductsChartData = {
    labels: popularProducts.slice(0, 5).map(product => product.product_name.length > 15 ? product.product_name.substring(0, 15) + '...' : product.product_name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: popularProducts.slice(0, 5).map(product => Number(product.total_quantity_sold)),
        backgroundColor: 'rgba(249, 115, 22, 0.6)',
        borderColor: 'rgba(249, 115, 22, 1)',
        borderWidth: 1,
      },
      {
        label: 'Revenue (₱)',
        data: popularProducts.slice(0, 5).map(product => Number(product.total_revenue)),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };

  const priceChangesChartData = {
    labels: priceChanges
      .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
      .map(change => new Date(change.changed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Price (₱)',
        data: priceChanges
          .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
          .map(change => Number(change.new_price)),
        borderColor: 'rgba(249, 115, 22, 1)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.1,
      },
    ],
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics &amp; Reports</h1>

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
            {totalTransactions > 0 ? `₱${(totalRevenue / totalTransactions).toFixed(2)}` : '₱0.00'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Popular Products Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Product Sales Chart</h2>
            <p className="text-sm text-gray-500">Top 5 products by quantity sold</p>
          </div>
          <div className="p-6">
            <Bar data={popularProductsChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>
        </div>

        {/* Price Changes Line Chart */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Price Changes Over Time</h2>
            <p className="text-sm text-gray-500">Historical price adjustments</p>
          </div>
          <div className="p-6">
            <Line data={priceChangesChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div>
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
            {popularProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales data yet.</p>
            ) : (
              <div className="space-y-4">
                {popularProducts.map((product, index) => (
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
                        ₱{Number(product.total_revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Revenue Products */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Revenue Generators</h2>
            <p className="text-sm text-gray-500">Products with highest revenue</p>
          </div>
          <div className="p-6">
            {topRevenueProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales data yet.</p>
            ) : (
              <div className="space-y-4">
                {topRevenueProducts.map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        <p className="text-sm text-gray-500">{product.transaction_count} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₱{Number(product.total_revenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-500">{product.total_quantity_sold} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          {priceChanges.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No price changes recorded yet.</p>
          ) : (
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
                {priceChanges.map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{change.product_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">₱{Number(change.old_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">₱{Number(change.new_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                        Number(change.percentage_change) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Number(change.percentage_change) > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(Number(change.percentage_change)).toFixed(2)}%
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
          )}
        </div>
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Price History Algorithm:</strong> Sales are calculated using the price at the time of each transaction. 
            When a product price changes, only new sales use the new price. Previous sales retain their original unit price, 
            ensuring accurate historical revenue reporting regardless of current pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
