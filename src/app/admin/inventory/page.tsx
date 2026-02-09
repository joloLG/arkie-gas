'use client';

import { useState } from 'react';
import { Plus, Minus, AlertTriangle, History, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_level: number;
}

interface StockMovement {
  id: string;
  product_name: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
}

const sampleProducts: Product[] = [
  { id: '1', name: '11kg LPG Tank', stock_quantity: 25, min_stock_level: 10 },
  { id: '2', name: '5kg LPG Tank', stock_quantity: 15, min_stock_level: 5 },
  { id: '3', name: '2.7kg LPG Tank', stock_quantity: 8, min_stock_level: 5 },
  { id: '4', name: '50kg Industrial Tank', stock_quantity: 3, min_stock_level: 5 },
];

const sampleMovements: StockMovement[] = [
  { id: '1', product_name: '11kg LPG Tank', type: 'out', quantity: 2, previous_stock: 27, new_stock: 25, reason: 'Sale recorded', created_at: '2026-02-09T10:00:00' },
  { id: '2', product_name: '5kg LPG Tank', type: 'in', quantity: 10, previous_stock: 5, new_stock: 15, reason: 'New stock arrival', created_at: '2026-02-08T09:00:00' },
  { id: '3', product_name: '2.7kg LPG Tank', type: 'out', quantity: 1, previous_stock: 9, new_stock: 8, reason: 'Sale recorded', created_at: '2026-02-08T14:00:00' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const lowStockProducts = products.filter(p => p.stock_quantity < p.min_stock_level);

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setShowAdjustmentModal(true);
  };

  const submitAdjustment = () => {
    if (!selectedProduct || adjustmentQty === 0) return;
    
    const newStock = selectedProduct.stock_quantity + adjustmentQty;
    
    // Update local state
    setProducts(products.map(p => 
      p.id === selectedProduct.id 
        ? { ...p, stock_quantity: newStock }
        : p
    ));
    
    setShowAdjustmentModal(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory Management</h1>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-red-800">Low Stock Alert</h2>
          </div>
          <p className="text-sm text-red-700">
            {lowStockProducts.length} product(s) are below minimum stock level.
          </p>
        </div>
      )}

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total Units</p>
          <p className="text-2xl font-bold text-gray-900">
            {products.reduce((sum, p) => sum + p.stock_quantity, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-600">{lowStockProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Today&apos;s Movements</p>
          <p className="text-2xl font-bold text-gray-900">3</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Products Stock */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Current Stock Levels
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">Min: {product.min_stock_level} units</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${
                      product.stock_quantity < product.min_stock_level 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {product.stock_quantity} units
                    </span>
                    <button
                      onClick={() => handleAdjustStock(product)}
                      className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <History className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sampleMovements.map((movement) => (
                <div key={movement.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-lg ${
                    movement.type === 'in' ? 'bg-green-100 text-green-600' :
                    movement.type === 'out' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {movement.type === 'in' ? <Plus className="h-4 w-4" /> :
                     movement.type === 'out' ? <Minus className="h-4 w-4" /> :
                     <History className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{movement.product_name}</p>
                    <p className="text-sm text-gray-500">{movement.reason}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(movement.created_at).toLocaleString('en-PH')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${
                      movement.type === 'in' ? 'text-green-600' :
                      movement.type === 'out' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}
                      {movement.quantity}
                    </span>
                    <p className="text-xs text-gray-500">
                      {movement.previous_stock} → {movement.new_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Adjust Stock: {selectedProduct.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Current stock: {selectedProduct.stock_quantity} units
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Use positive for stock in, negative for stock out"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positive = add stock, Negative = remove stock
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Damaged goods, Stock count correction"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  New stock level will be: <strong>{selectedProduct.stock_quantity + adjustmentQty} units</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                disabled={adjustmentQty === 0}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
