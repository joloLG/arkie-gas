'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Minus, PackageOpen, DollarSign, User, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db, type Product, type Customer } from '@/lib/db-complete';

export default function RecordSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [basePrice, setBasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [customerPrice, setCustomerPrice] = useState(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [emptyTanksReturned, setEmptyTanksReturned] = useState(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [productsResult, customersResult] = await Promise.all([
        db.products.getAll(),
        db.customers.getAll()
      ]);
      
      const activeProducts = (productsResult.data as Product[]) || [];
      const activeCustomers = (customersResult.data as Customer[]) || [];
      
      setProducts(activeProducts);
      setCustomers(activeCustomers);
      setPageLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setBasePrice(selectedProduct.base_price);
      setSellingPrice(selectedProduct.current_selling_price);
      setCustomerPrice(selectedProduct.current_selling_price);
    }
  }, [selectedProduct]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setEmptyTanksReturned(0);
    setBasePrice(product.base_price);
    setSellingPrice(product.current_selling_price);
    setCustomerPrice(product.current_selling_price);
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
    // Try to find matching customer by exact name match first
    let matchingCustomer = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    // If no exact match, try partial match for better UX
    if (!matchingCustomer) {
      matchingCustomer = customers.find(c =>
        c.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(c.name.toLowerCase())
      );
    }
    setSelectedCustomer(matchingCustomer || null);
  };

  const calculateTotal = () => {
    return customerPrice * quantity;
  };

  const calculateProfit = () => {
    return (customerPrice - basePrice) * quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    if (customerName.trim() === '') {
      setError('Please enter customer name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create or get customer
      let customerId = selectedCustomer?.id;
      if (!customerId && customerName.trim()) {
        const { data: newCustomer } = await db.customers.create({
          name: customerName.trim(),
          contact_number: null,
          address: null,
          is_active: true,
        });
        customerId = newCustomer?.id;
      }

      // Create sale
      const { error: saleError } = await db.sales.create({
        customer_id: customerId || null,
        product_id: selectedProduct.id,
        quantity,
        base_price: basePrice,
        selling_price: sellingPrice,
        customer_price: customerPrice,
        payment_type: paymentType,
        is_credit_paid: paymentType === 'cash',
        empty_tanks_returned: emptyTanksReturned,
        empty_tanks_borrowed: Math.max(0, quantity - emptyTanksReturned),
        notes: notes.trim() || null,
        sold_by: null, // Will be set by trigger
      });

      if (saleError) {
        throw saleError;
      }

      setSuccess(true);
      // Reset form after successful submission
      setTimeout(() => {
        setSuccess(false);
        // Reset form fields
        setSelectedProduct(null);
        setSelectedCustomer(null);
        setCustomerName('');
        setQuantity(1);
        setBasePrice(0);
        setSellingPrice(0);
        setCustomerPrice(0);
        setPaymentType('cash');
        setEmptyTanksReturned(0);
        setNotes('');
        setError('');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to record sale');
    } finally {
      setIsLoading(false);
    }
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
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/dashboard" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Record Sale</h1>
        <p className="text-gray-600 mt-2">Add a new sales transaction</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span className="font-medium">Sale recorded successfully!</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Product Selection */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PackageOpen className="h-5 w-5" />
            Select Product
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductSelect(product)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  selectedProduct?.id === product.id
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="aspect-square bg-gray-100 relative">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PackageOpen className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {selectedProduct?.id === product.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-3 text-left">
                  <p className="text-xs font-medium text-gray-900 truncate">{product.brand}</p>
                  <p className="text-xs text-gray-500 truncate">{product.name}</p>
                  <p className="text-sm font-semibold text-orange-600 mt-1">
                    ₱{product.current_selling_price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Stock: {product.stock_quantity}</p>
                </div>
              </button>
            ))}
          </div>

          {selectedProduct && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-900">
                Selected: {selectedProduct.brand} - {selectedProduct.name}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Base Price: ₱{selectedProduct.base_price.toFixed(2)} | 
                Selling Price: ₱{selectedProduct.current_selling_price.toFixed(2)} | 
                Stock: {selectedProduct.stock_quantity}
              </p>
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter customer name"
                required
              />
              {selectedCustomer && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Existing customer: {selectedCustomer.name}</span>
                </div>
              )}
              {customers.length > 0 && (
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Select existing customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentType === 'cash'}
                    onChange={(e) => setPaymentType(e.target.value as 'cash')}
                    className="mr-2"
                  />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="credit"
                    checked={paymentType === 'credit'}
                    onChange={(e) => setPaymentType(e.target.value as 'credit')}
                    className="mr-2"
                  />
                  <span className="text-sm">Credit Loan</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing and Quantity */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Quantity
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price (Cost)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={customerPrice}
                  onChange={(e) => setCustomerPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  ₱{calculateTotal().toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Profit:</span>
                <span className="ml-2 font-semibold text-green-600">
                  ₱{calculateProfit().toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tanks Outstanding:</span>
                <span className="ml-2 font-semibold text-orange-600">
                  {Math.max(0, quantity - emptyTanksReturned)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty Tanks Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Empty Tanks</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empty Tanks Returned
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmptyTanksReturned(Math.max(0, emptyTanksReturned - 1))}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  max={quantity}
                  value={emptyTanksReturned}
                  onChange={(e) => setEmptyTanksReturned(Math.max(0, Math.min(quantity, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setEmptyTanksReturned(Math.min(quantity, emptyTanksReturned + 1))}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {quantity - emptyTanksReturned} tanks will be borrowed
              </p>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes (Optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
            placeholder="Add any notes about this sale..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedProduct || customerName.trim() === ''}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
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
