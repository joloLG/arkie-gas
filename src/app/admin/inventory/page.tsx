'use client';

import { useEffect, useState } from 'react';
import { Plus, Minus, AlertTriangle, History, Package, Loader2 } from 'lucide-react';
import { db, type Product, type InventoryMovement } from '@/lib/db';

interface MovementWithProduct extends InventoryMovement {
  products: { name: string } | null;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<MovementWithProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [productsRes, movementsRes] = await Promise.all([
        db.products.getAll(),
        db.inventory.getMovements(),
      ]);
      setProducts((productsRes.data as Product[]) || []);
      setMovements(((movementsRes.data as MovementWithProduct[]) || []).slice(0, 15));
      setLoading(false);
    }
    loadData();
  }, []);

  const lowStockProducts = products.filter(p => p.is_active && p.stock_quantity < 10);
  const todayMovements = movements.filter(m => {
    const d = new Date(m.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setShowAdjustmentModal(true);
  };

  const submitAdjustment = async () => {
    if (!selectedProduct || adjustmentQty === 0 || !adjustmentReason.trim()) return;
    setAdjusting(true);

    const { error } = await db.inventory.adjustStock(
      selectedProduct.id,
      adjustmentQty,
      adjustmentReason
    );

    if (error) {
      alert('Failed to adjust stock: ' + (error instanceof Error ? error.message : String(error)));
      setAdjusting(false);
      return;
    }

    // Refresh data
    const [productsRes, movementsRes] = await Promise.all([
      db.products.getAll(),
      db.inventory.getMovements(),
    ]);
    setProducts((productsRes.data as Product[]) || []);
    setMovements(((movementsRes.data as MovementWithProduct[]) || []).slice(0, 15));

    setAdjusting(false);
    setShowAdjustmentModal(false);
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
          <p className="text-2xl font-bold text-gray-900">{products.filter(p => p.is_active).length}</p>
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
          <p className="text-2xl font-bold text-gray-900">{todayMovements.length}</p>
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
            {products.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No products found.</p>
            ) : (
              <div className="space-y-4">
                {products.filter(p => p.is_active).map((product) => (
                  <div key={product.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${
                        product.stock_quantity < 10 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {product.stock_quantity} units
                      </span>
                      <button
                        onClick={() => handleAdjustStock(product)}
                        className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Adjust stock"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h2>
          </div>
          <div className="p-6">
            {movements.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No stock movements yet.</p>
            ) : (
              <div className="space-y-4">
                {movements.map((movement) => (
                  <div key={movement.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                    <div className={`p-2 rounded-lg ${
                      movement.movement_type === 'in' ? 'bg-green-100 text-green-600' :
                      movement.movement_type === 'out' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {movement.movement_type === 'in' ? <Plus className="h-4 w-4" /> :
                       movement.movement_type === 'out' ? <Minus className="h-4 w-4" /> :
                       <History className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{movement.products?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{movement.reason}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(movement.created_at).toLocaleString('en-PH')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${
                        movement.movement_type === 'in' ? 'text-green-600' :
                        movement.movement_type === 'out' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                        {movement.quantity}
                      </span>
                      <p className="text-xs text-gray-500">
                        {movement.previous_stock} → {movement.new_stock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in">
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
                  Reason *
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
                disabled={adjusting}
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                disabled={adjustmentQty === 0 || !adjustmentReason.trim() || adjusting}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  'Adjust Stock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
