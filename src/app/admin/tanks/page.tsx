'use client';

import { useEffect, useState } from 'react';
import { PackageOpen, Plus, RotateCcw, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { db, type EmptyTankReturn, type Customer, type Product } from '@/lib/db';

interface EmptyTankReturnWithDetails extends EmptyTankReturn {
  customers: { name: string } | null;
  products: { name: string; brand: string | null } | null;
}

export default function EmptyTanksPage() {
  const [returns, setReturns] = useState<EmptyTankReturnWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReturn, setShowAddReturn] = useState(false);
  const [newReturn, setNewReturn] = useState({
    customer_id: '',
    product_id: '',
    quantity_returned: 0,
    notes: ''
  });

  useEffect(() => {
    async function fetchData() {
      const [returnsResult, customersResult, productsResult] = await Promise.all([
        db.emptyTankReturns.getAll(),
        db.customers.getAll(),
        db.products.getAll()
      ]);
      
      setReturns((returnsResult.data as EmptyTankReturnWithDetails[]) || []);
      setCustomers((customersResult.data as Customer[]) || []);
      setProducts((productsResult.data as Product[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleAddReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await db.emptyTankReturns.create({
      sale_id: null, // General return, not tied to specific sale
      customer_id: newReturn.customer_id,
      product_id: newReturn.product_id,
      quantity_returned: newReturn.quantity_returned,
      notes: newReturn.notes || null,
      created_by: null
    });

    if (error) {
      alert('Failed to record return: ' + error.message);
    } else {
      // Refresh returns list
      const { data } = await db.emptyTankReturns.getAll();
      setReturns((data as EmptyTankReturnWithDetails[]) || []);
      
      // Reset form
      setNewReturn({
        customer_id: '',
        product_id: '',
        quantity_returned: 0,
        notes: ''
      });
      setShowAddReturn(false);
    }
  };

  const totalReturned = returns.reduce((sum, r) => sum + r.quantity_returned, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <PackageOpen className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Empty Tank Returns</h1>
        </div>
        <button
          onClick={() => setShowAddReturn(!showAddReturn)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Return
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tanks Returned</p>
              <p className="text-2xl font-bold text-gray-900">{totalReturned}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Return Records</p>
            <p className="text-lg font-semibold text-gray-900">{returns.length}</p>
          </div>
        </div>
      </div>

      {/* Add Return Form */}
      {showAddReturn && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Record New Return</h3>
          <form onSubmit={handleAddReturn} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  value={newReturn.customer_id}
                  onChange={(e) => setNewReturn(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product *
                </label>
                <select
                  value={newReturn.product_id}
                  onChange={(e) => setNewReturn(prev => ({ ...prev, product_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.brand && `(${product.brand})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Returned *
              </label>
              <input
                type="number"
                min="1"
                value={newReturn.quantity_returned}
                onChange={(e) => setNewReturn(prev => ({ ...prev, quantity_returned: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newReturn.notes}
                onChange={(e) => setNewReturn(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Return notes..."
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Record Return
              </button>
              <button
                type="button"
                onClick={() => setShowAddReturn(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Returns List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Returns</h2>
        </div>
        <div className="p-6">
          {returns.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No returns recorded yet</h3>
              <p className="text-gray-500 mb-4">Start by recording your first empty tank return</p>
              <button
                onClick={() => setShowAddReturn(true)}
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Record Return
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((returnRecord) => (
                <div key={returnRecord.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {returnRecord.customers?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {returnRecord.products?.name} {returnRecord.products?.brand && `(${returnRecord.products.brand})`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(returnRecord.return_date).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">
                      {returnRecord.quantity_returned} tank{returnRecord.quantity_returned > 1 ? 's' : ''}
                    </p>
                    {returnRecord.notes && (
                      <p className="text-xs text-gray-500 max-w-xs truncate">
                        {returnRecord.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
