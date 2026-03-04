'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PackageOpen, Users, AlertCircle, Loader2 } from 'lucide-react';
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
  brand: string | null;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  transaction_count: number;
}

interface PriceChangeDetailed {
  id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  old_price: number;
  new_price: number;
  changed_at: string;
  price_difference: number;
  percentage_change: number;
}

interface CustomerCreditSummary {
  customer_id: string;
  customer_name: string;
  contact_number: string | null;
  total_credit: number;
  credit_limit: number;
  credit_available: number;
  outstanding_credit: number;
  paid_credit: number;
}

interface EmptyTankSummary {
  product_id: string;
  product_name: string;
  brand: string | null;
  current_empty_stock: number;
  total_borrowed: number;
  total_returned_at_sale: number;
  total_returned_later: number;
  outstanding_empty_tanks: number;
}

interface ProfitAnalysis {
  sale_date: string;
  product_name: string;
  brand: string | null;
  quantity: number;
  selling_price: number;
  bought_price: number;
  profit: number;
  profit_percentage: number;
  sale_type: string;
}

export default function AnalyticsPage() {
  const [popularProducts, setPopularProducts] = useState<MostBoughtProduct[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChangeDetailed[]>([]);
  const [creditSummary, setCreditSummary] = useState<CustomerCreditSummary[]>([]);
  const [tankSummary, setTankSummary] = useState<EmptyTankSummary[]>([]);
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [productsRes, priceRes, creditRes, tankRes, profitRes] = await Promise.all([
        db.analytics.getMostBoughtProducts(10),
        db.priceHistory.getAll(),
        db.analytics.getCustomerCreditSummary(),
        db.analytics.getEmptyTankSummary(),
        db.analytics.getProfitAnalysis()
      ]);
      setPopularProducts((productsRes.data as MostBoughtProduct[]) || []);
      setPriceChanges(((priceRes.data as PriceChangeDetailed[]) || []).slice(0, 10));
      setCreditSummary((creditRes.data as CustomerCreditSummary[]) || []);
      setTankSummary((tankRes.data as EmptyTankSummary[]) || []);
      setProfitAnalysis((profitRes.data as ProfitAnalysis[]) || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const totalRevenue = popularProducts.reduce((sum, p) => sum + Number(p.total_revenue), 0);
  const totalQuantity = popularProducts.reduce((sum, p) => sum + Number(p.total_quantity_sold), 0);
  const totalTransactions = popularProducts.reduce((sum, p) => sum + Number(p.transaction_count), 0);
  const totalProfit = popularProducts.reduce((sum, p) => sum + Number(p.total_profit || 0), 0);
  const totalOutstandingCredits = creditSummary.reduce((sum, c) => sum + (c.outstanding_credit || 0), 0);
  const totalOutstandingTanks = tankSummary.reduce((sum, t) => sum + (t.outstanding_empty_tanks || 0), 0);

  const topRevenueProducts = [...popularProducts].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));
  const topProfitProducts = [...popularProducts].sort((a, b) => Number(b.total_profit || 0) - Number(a.total_profit || 0));

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total Profit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₱{totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600">Outstanding Credits</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₱{totalOutstandingCredits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600">Empty Tanks Out</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOutstandingTanks}</p>
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

      {/* Credit and Tank Summary */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Customer Credit Summary */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Customer Credit Summary</h2>
            <p className="text-sm text-gray-500">Customers with outstanding credits</p>
          </div>
          <div className="p-6">
            {creditSummary.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No outstanding credits.</p>
            ) : (
              <div className="space-y-3">
                {creditSummary.slice(0, 5).map((customer) => (
                  <div key={customer.customer_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{customer.customer_name}</p>
                      <p className="text-sm text-gray-500">Limit: ₱{customer.credit_limit.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        ₱{customer.outstanding_credit.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {((customer.outstanding_credit / customer.credit_limit) * 100).toFixed(1)}% used
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty Tank Summary */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Empty Tank Tracking</h2>
            <p className="text-sm text-gray-500">Products with outstanding tanks</p>
          </div>
          <div className="p-6">
            {tankSummary.length === 0 ? (
              <p className="text-gray-500 text-center py-4">All tanks returned.</p>
            ) : (
              <div className="space-y-3">
                {tankSummary.slice(0, 5).map((tank) => (
                  <div key={tank.product_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {tank.product_name} {tank.brand && `(${tank.brand})`}
                      </p>
                      <p className="text-sm text-gray-500">In stock: {tank.current_empty_stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {tank.outstanding_empty_tanks} out
                      </p>
                      <p className="text-xs text-gray-500">
                        Borrowed: {tank.total_borrowed}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
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

      {/* Profit Analysis */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profit Analysis</h2>
          <p className="text-sm text-gray-500">Recent sales with profit margins</p>
        </div>
        <div className="p-6">
          {profitAnalysis.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No profit data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Bought Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Sold Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Profit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Margin</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {profitAnalysis.slice(0, 10).map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-900">{sale.product_name}</span>
                          {sale.brand && <span className="text-sm text-gray-500 ml-2">({sale.brand})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{sale.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{sale.bought_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{sale.selling_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₱{Math.abs(sale.profit).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${sale.profit_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {sale.profit_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          sale.sale_type === 'credit' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {sale.sale_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
