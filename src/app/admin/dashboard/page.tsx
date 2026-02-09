import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const stats = [
  {
    title: "Total Sales Today",
    value: "₱12,450",
    change: "+12%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Products Sold Today",
    value: "45",
    change: "+8%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    title: "Total Products",
    value: "12",
    change: "0%",
    trend: "neutral",
    icon: Package,
  },
  {
    title: "Low Stock Items",
    value: "3",
    change: "-2",
    trend: "down",
    icon: TrendingUp,
  },
];

const recentSales = [
  { id: 1, product: "11kg LPG Tank", quantity: 2, amount: "₱1,700", time: "2 mins ago" },
  { id: 2, product: "5kg LPG Tank", quantity: 1, amount: "₱850", time: "15 mins ago" },
  { id: 3, product: "11kg LPG Tank", quantity: 3, amount: "₱2,550", time: "1 hour ago" },
  { id: 4, product: "2.7kg LPG Tank", quantity: 2, amount: "₱700", time: "2 hours ago" },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <stat.icon className="h-5 w-5 text-orange-500" />
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 
                stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stat.change}
                {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
                {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{sale.product}</p>
                    <p className="text-sm text-gray-500">{sale.quantity} item(s) • {sale.time}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{sale.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <a 
                href="/admin/products/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <Package className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Add Product</span>
              </a>
              <a 
                href="/admin/sales/new" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <ShoppingCart className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Record Sale</span>
              </a>
              <a 
                href="/admin/inventory" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <TrendingUp className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">View Inventory</span>
              </a>
              <a 
                href="/admin/analytics" 
                className="p-4 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors text-center"
              >
                <DollarSign className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">View Analytics</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
