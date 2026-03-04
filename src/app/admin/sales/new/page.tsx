'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Minus, Users, PackageOpen, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { db, type Product, type Customer } from '@/lib/db';

export default function RecordSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [boughtPrice, setBoughtPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [saleType, setSaleType] = useState<'cash' | 'credit'>('cash');
  const [emptyTanksReturned, setEmptyTanksReturned] = useState(0);
  const [emptyTanksBorrowed, setEmptyTanksBorrowed] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const [productsResult, customersResult] = await Promise.all([
        db.products.getAll(),
        db.customers.getAll()
      ]);
      
      const activeProducts = ((productsResult.data as Product[]) || []).filter(p => p.is_active && p.stock_quantity > 0);
      const activeCustomers = ((customersResult.data as Customer[]) || []).filter(c => c.is_active);
      
      setProducts(activeProducts);
      setCustomers(activeCustomers);
      setPageLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setBoughtPrice(selectedProduct.bought_price || 0);
      setSellingPrice(Number(selectedProduct.current_price));
    }
  }, [selectedProduct]);

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setQuantity(1);
    setEmptyTanksReturned(0);
    setEmptyTanksBorrowed(0);
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    if (customer) {
      setCustomerName(customer.name);
    }
  };

  const handleCustomerNameChange = (name: string) => {
    setCustomerName(name);
    // Clear selected customer if name doesn't match any existing customer
    const matchingCustomer = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    setSelectedCustomer(matchingCustomer || null);
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return sellingPrice * quantity;
  };

  const calculateProfit = () => {
    if (!selectedProduct) return 0;
    return (sellingPrice - boughtPrice) * quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    setError('');

    const totalAmount = calculateTotal();
    const profit = calculateProfit();
    const creditAmount = saleType === 'credit' ? totalAmount : 0;

    const { error: dbError } = await db.sales.create({
      product_id: selectedProduct.id,
      customer_id: selectedCustomer?.id || null,
      quantity,
      unit_price: sellingPrice,
      bought_price: boughtPrice,
      total_amount: totalAmount,
      profit,
      empty_tanks_returned: emptyTanksReturned,
      empty_tanks_borrowed: emptyTanksBorrowed,
      sale_type: saleType,
      credit_amount: creditAmount,
      is_credit_paid: false,
      notes: customerName ? `Customer: ${customerName}. ${notes || ''}`.trim() : (notes || null),
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

      <form onSubmit={handleSubmit} className="max-w-4xl">
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
                  {product.name} {product.brand && `(${product.brand})`} - ₱{Number(product.current_price).toFixed(2)} (Stock: {product.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Selection */}
          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name
            </label>
            <div className="space-y-2">
              <input
                type="text"
                id="customer"
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter customer name (for cash sales, you can leave blank)"
              />
              {customers.length > 0 && (
                <div className="text-xs text-gray-500">
                  💡 Tip: Start typing to see existing customers, or enter a new name for one-time sales
                </div>
              )}
              {customerName && customers.filter(c => 
                c.name.toLowerCase().includes(customerName.toLowerCase())
              ).length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()))
                    .slice(0, 5)
                    .map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setCustomerName(customer.name);
                          setSelectedCustomer(customer);
                        }}
                        className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">
                          Credit Limit: ₱{customer.credit_limit.toFixed(2)} | 
                          Current: ₱{customer.total_credit.toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Sale Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sale Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="saleType"
                  value="cash"
                  checked={saleType === 'cash'}
                  onChange={() => setSaleType('cash')}
                  className="mr-2"
                />
                <span className="text-sm">Cash Sale</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="saleType"
                  value="credit"
                  checked={saleType === 'credit'}
                  onChange={() => setSaleType('credit')}
                  disabled={!customerName.trim()}
                  className="mr-2"
                />
                <span className="text-sm">Credit Sale {(!customerName.trim() && saleType === 'credit') && '(requires customer name)'}</span>
              </label>
            </div>
          </div>

          {/* Price Information */}
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="boughtPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Bought Price per Unit *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    id="boughtPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={boughtPrice}
                    onChange={(e) => setBoughtPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price per Unit *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    id="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          {selectedProduct && (
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
                <span className="text-sm text-gray-500">
                  Available: {selectedProduct.stock_quantity} units
                </span>
              </div>
            </div>
          )}

          {/* Empty Tank Management */}
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="emptyTanksReturned" className="block text-sm font-medium text-gray-700 mb-2">
                  Empty Tanks Returned
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEmptyTanksReturned(Math.max(0, emptyTanksReturned - 1))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    id="emptyTanksReturned"
                    type="number"
                    min="0"
                    value={emptyTanksReturned}
                    onChange={(e) => setEmptyTanksReturned(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-center px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEmptyTanksReturned(emptyTanksReturned + 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="emptyTanksBorrowed" className="block text-sm font-medium text-gray-700 mb-2">
                  Empty Tanks Borrowed
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEmptyTanksBorrowed(Math.max(0, emptyTanksBorrowed - 1))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    id="emptyTanksBorrowed"
                    type="number"
                    min="0"
                    value={emptyTanksBorrowed}
                    onChange={(e) => setEmptyTanksBorrowed(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-center px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEmptyTanksBorrowed(emptyTanksBorrowed + 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-500">
                    Available: {selectedProduct.empty_tank_stock || 0} tanks
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-blue-800 font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₱{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-medium">Profit:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₱{calculateProfit().toFixed(2)}
                  </span>
                </div>
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
            disabled={isLoading || !selectedProduct || (saleType === 'credit' && !customerName.trim())}
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
