'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Minus, Users, PackageOpen, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { db, type Product, type Customer } from '@/lib/db';

export default function RecordSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProducts() {
      const { data } = await db.products.getAll();
      const active = ((data as Product[]) || []).filter(p => p.is_active && p.stock_quantity > 0);
      setProducts(active);
      setPageLoading(false);
    }
    loadProducts();
  }, []);

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    setError('');

    const unitPrice = Number(selectedProduct.current_selling_price);
    const totalAmount = unitPrice * quantity;

    const { error: dbError } = await db.sales.create({
      product_id: selectedProduct.id,
      customer_id: null, // No customer selected in this simplified version
      quantity,
      unit_price: unitPrice,
      bought_price: selectedProduct.base_price || 0,
      total_amount: totalAmount,
      profit: unitPrice - (selectedProduct.base_price || 0),
      empty_tanks_returned: 0,
      empty_tanks_borrowed: 0,
      sale_type: 'cash',
      credit_amount: 0,
      is_credit_paid: true,
      notes: notes || null,
      sold_by: null,
    });

    if (dbError) {
      setError('Failed to record sale: ' + dbError.message);
      setIsLoading(false);
      return;
    }

    router.push('/admin/sales');
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/sales"
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Record New Sale</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm max-w-2xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-2">
              Select Product *
            </label>
            <select
              id="product"
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Choose a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - ₱{Number(product.current_selling_price).toFixed(2)} (Stock: {product.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          {/* Price Display (read-only) */}
          {selectedProduct && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Unit Price:</span>
                <span className="font-semibold text-gray-900">₱{Number(selectedProduct.current_selling_price).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">
                This price will be saved with the sale record. Future price changes won&apos;t affect this sale&apos;s total.
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock_quantity || 999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Total Preview */}
          {selectedProduct && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex justify-between items-center">
                <span className="text-orange-800 font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-orange-600">
                  ₱{(Number(selectedProduct.current_selling_price) * quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Any additional information about this sale..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 mt-6">
          <Link
            href="/admin/sales"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading || !selectedProduct}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Sale'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
