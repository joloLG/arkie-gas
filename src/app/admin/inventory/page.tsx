'use client';

import { useEffect, useState } from 'react';
import { Plus, Minus, AlertTriangle, History, PackageOpen, Loader2, Edit, Users, AlertCircle, X, Search, ArrowRight, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db, type Product, type InventoryMovement, type Sale, type Customer } from '@/lib/db';
import { useOptimizedData, fetchParallel } from '@/hooks/useOptimizedData';
import { TableSkeleton, FormSkeleton } from '@/components/ui/Skeleton';

interface MovementWithProduct extends InventoryMovement {
  products: { name: string } | null;
}

interface SaleWithCustomer extends Sale {
  customers: { name: string } | null;
  products: { name: string; brand: string | null } | null;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<MovementWithProduct[]>([]);
  const [sales, setSales] = useState<SaleWithCustomer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [newStockQty, setNewStockQty] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTankDetails, setShowTankDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    brand: string;
    description: string | null;
    current_selling_price: number;
    base_price: number;
    image_url: string | null;
    stock_quantity: number;
    is_active: boolean;
  }>({
    name: '',
    brand: '', // Make brand required to match database schema
    description: null,
    current_selling_price: 0, // Updated to match database
    base_price: 0, // Updated to match database
    image_url: null,
    stock_quantity: 0,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Use optimized data fetching
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useOptimizedData(
    'inventory-products',
    async () => {
      const result = await db.products.getAll();
      return { data: result };
    },
    []
  );

  const { data: movementsData, loading: movementsLoading, refetch: refetchMovements } = useOptimizedData(
    'inventory-movements',
    async () => {
      const result = await db.inventory.getMovements();
      return { data: result };
    },
    []
  );

  const { data: salesData, loading: salesLoading } = useOptimizedData(
    'inventory-sales',
    async () => {
      const result = await db.sales.getAll();
      return { data: result };
    },
    []
  );

  const dataLoading = productsLoading || movementsLoading || salesLoading;

  // Update state with fetched data
  useEffect(() => {
    if (productsData?.data) setProducts(productsData.data as Product[]);
    if (movementsData?.data) setMovements((movementsData.data as MovementWithProduct[]).slice(0, 15));
    if (salesData?.data) setSales((salesData.data as SaleWithCustomer[]).filter(sale => 
      (sale.empty_tanks_borrowed || 0) > (sale.empty_tanks_returned || 0)
    ));
  }, [productsData, movementsData, salesData]);

  const lowStockProducts = products.filter(p => p.is_active && p.stock_quantity < 10);
  const todayMovements = movements.filter(m => {
    const d = new Date(m.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // Calculate outstanding empty tanks
  const outstandingEmptyTanks = sales.reduce((acc, sale) => {
    const outstanding = (sale.empty_tanks_borrowed || 0) - (sale.empty_tanks_returned || 0);
    if (outstanding > 0) {
      const key = `${sale.customers?.name || 'Unknown'}-${sale.products?.name || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          customerName: sale.customers?.name || 'Unknown',
          productName: sale.products?.name || 'Unknown',
          productBrand: sale.products?.brand || null,
          totalBorrowed: 0,
          totalReturned: 0,
          outstanding: 0,
          sales: []
        };
      }
      acc[key].totalBorrowed += sale.empty_tanks_borrowed || 0;
      acc[key].totalReturned += sale.empty_tanks_returned || 0;
      acc[key].outstanding += outstanding;
      acc[key].sales.push(sale);
    }
    return acc;
  }, {} as { [key: string]: {
    customerName: string;
    productName: string;
    productBrand: string | null;
    totalBorrowed: number;
    totalReturned: number;
    outstanding: number;
    sales: SaleWithCustomer[];
  } });

  const outstandingTanksList = Object.values(outstandingEmptyTanks);

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setShowAdjustmentModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand || '',
      description: product.description,
      current_selling_price: product.current_selling_price, // Updated
      base_price: product.base_price, // Updated
      image_url: product.image_url || null,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
    });
    setImageFile(null);
    setImagePreview(product.image_url);
    setShowAddForm(true);
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
    await Promise.all([
      refetchProducts(),
      refetchMovements()
    ]);
    // Re-fetch to update local state
    const [productsRes] = await Promise.all([db.products.getAll()]);
    setProducts((productsRes.data as Product[]) || []);
    setAdjusting(false);
    setShowAdjustmentModal(false);
  };

  const submitEditStock = async () => {
    if (!selectedProduct || newStockQty < 0) return;
    setAdjusting(true);

    const adjustment = newStockQty - selectedProduct.stock_quantity;
    const { error } = await db.inventory.adjustStock(
      selectedProduct.id,
      adjustment,
      'Manual stock adjustment'
    );

    if (error) {
      alert('Failed to update stock: ' + (error instanceof Error ? error.message : String(error)));
      setAdjusting(false);
      return;
    }

    // Refresh data
    await Promise.all([
      refetchProducts(),
      refetchMovements()
    ]);
    // Re-fetch to update local state
    const [productsRes] = await Promise.all([db.products.getAll()]);
    setProducts((productsRes.data as Product[]) || []);
    setAdjusting(false);
    setShowEditModal(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle image upload first
    let imageUrl = formData.image_url; // Keep existing URL if no new file
    if (imageFile) {
      // For now, we'll use a placeholder or handle it client-side
      // In a real app, you'd upload to a service like Supabase Storage, AWS S3, etc.
      const reader = new FileReader();
      imageUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }
    
    if (editingProduct) {
      // Update existing product - use Product type format
      const updateData: Partial<Product> = {
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        current_selling_price: formData.current_selling_price, // Updated
        base_price: formData.base_price, // Updated
        image_url: imageUrl,
        stock_quantity: formData.stock_quantity,
        is_active: formData.is_active,
      };
      
      console.log('Update data being sent:', updateData);
      const { error } = await db.products.update(editingProduct.id, updateData);
      if (error) {
        console.error('Update error:', error);
        alert('Failed to update product: ' + (error instanceof Error ? error.message : String(error)));
        return;
      }
    } else {
      // Create new product - use database field format
      const productData = {
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        base_price: formData.base_price, // Now matches database
        current_selling_price: formData.current_selling_price, // Now matches database
        image_url: imageUrl,
        stock_quantity: formData.stock_quantity,
        is_active: formData.is_active,
      };
      
      console.log('Create data being sent:', productData);
      const { error } = await db.products.create(productData);
      if (error) {
        console.error('Create error:', error);
        alert('Failed to create product: ' + (error instanceof Error ? error.message : String(error)));
        return;
      }
    }

    // Reset form and refresh data
    setShowAddForm(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '', // Make brand required
      description: null,
      current_selling_price: 0, // Updated
      base_price: 0, // Updated
      image_url: null,
      stock_quantity: 0,
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);

    const [productsRes] = await Promise.all([db.products.getAll()]);
    setProducts((productsRes.data as Product[]) || []);
  };

  const totalTanks = products.reduce((sum, product) => sum + product.stock_quantity, 0);
  const outstandingTanks = outstandingTanksList.reduce((sum, tank) => sum + tank.outstanding, 0);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (dataLoading) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage products and stock levels</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <FormSkeleton />
          <TableSkeleton rows={5} columns={4} />
          <TableSkeleton rows={10} columns={6} />
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage products and stock levels</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Inventory</h2>
          <p className="text-red-600">Please try refreshing the page or contact support.</p>
          <button 
            onClick={() => {
              refetchProducts();
              refetchMovements();
            }}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Tracking</h1>
        <p className="text-gray-600">Manage products and monitor stock levels</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-linear-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Available Tanks</p>
              <p className="text-3xl font-bold">{totalTanks}</p>
              <p className="text-blue-100 text-sm mt-1">Total tanks in stock</p>
            </div>
            <PackageOpen className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <Link 
          href="/admin/customer-tanks"
          className="block bg-linear-to-r from-red-500 to-red-600 rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Unreturned Tanks</p>
              <p className="text-3xl font-bold">{outstandingTanks}</p>
              <p className="text-red-100 text-sm mt-1">Click to view details</p>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-200" />
              <ArrowRight className="h-5 w-5 text-red-200" />
            </div>
          </div>
        </Link>
      </div>

      {/* Add Product Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Product
        </button>
      </div>

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value || null})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter product description (optional)"
              />
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_selling_price}
                    onChange={(e) => setFormData({...formData, current_selling_price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Status</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Inactive products won't appear in sales
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    Choose Image
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {imageFile && (
                  <p className="text-sm text-gray-600">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    brand: '', // Make brand required
                    description: null,
                    current_selling_price: 0, // Updated
                    base_price: 0, // Updated
                    image_url: null,
                    stock_quantity: 0,
                    is_active: true,
                  });
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Base Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Selling Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.brand}</p>
                      <p className="text-sm text-gray-500">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400 mt-1">{product.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">
                    ₱{product.base_price?.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">
                    ₱{product.current_selling_price?.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {product.stock_quantity}
                    </span>
                    {product.stock_quantity < 10 && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    product.stock_quantity < 10 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {product.stock_quantity < 10 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(product)}
                      className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Adjust stock"
                    >
                      <History className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-xl shadow-sm mt-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            Recent Inventory Movements
          </h2>
        </div>
        <div className="p-6">
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent movements</p>
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

      {/* Outstanding Empty Tanks */}
      <div className="bg-white rounded-xl shadow-sm mt-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Outstanding Empty Tanks
          </h2>
        </div>
        <div className="p-6">
          {outstandingTanksList.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All empty tanks have been returned!</p>
          ) : (
            <div className="space-y-4">
              {outstandingTanksList.map((tank, index) => (
                <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{tank.customerName}</h4>
                      <p className="text-sm text-gray-600">
                        {tank.productName} {tank.productBrand && `(${tank.productBrand})`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-orange-600">
                        {tank.outstanding} tanks
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500">Borrowed</p>
                      <p className="font-semibold text-gray-900">{tank.totalBorrowed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Returned</p>
                      <p className="font-semibold text-gray-900">{tank.totalReturned}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Outstanding</p>
                      <p className="font-semibold text-orange-600">{tank.outstanding}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="text-xs text-gray-600">
                      <strong>Reminder:</strong> Customer needs to return {tank.outstanding} empty tank(s) to complete the exchange cycle.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Adjust Stock: {selectedProduct?.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Current stock: {selectedProduct?.stock_quantity} units
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
                  New stock level will be: <strong>{(selectedProduct?.stock_quantity || 0) + adjustmentQty} units</strong>
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

      {/* Edit Stock Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Stock: {selectedProduct?.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Current stock: {selectedProduct?.stock_quantity} units
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter new stock quantity"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Stock will be adjusted by: <strong>{newStockQty - (selectedProduct?.stock_quantity || 0) > 0 ? '+' : ''}{newStockQty - (selectedProduct?.stock_quantity || 0)} units</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={adjusting}
              >
                Cancel
              </button>
              <button
                onClick={submitEditStock}
                disabled={newStockQty < 0 || adjusting}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tank Details Modal */}
      {showTankDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Empty Tanks</h3>
              <button
                onClick={() => setShowTankDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {outstandingTanksList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No outstanding empty tanks found.</p>
              ) : (
                outstandingTanksList.map((tank, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{tank.productName}</h4>
                        <p className="text-sm text-gray-500">{tank.productBrand || 'No brand'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{tank.outstanding}</p>
                        <p className="text-xs text-gray-500">tanks outstanding</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Customer details:</p>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{tank.customerName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            Borrowed: <span className="font-medium">{tank.totalBorrowed}</span>
                          </span>
                          <span className="text-sm text-gray-600">
                            Returned: <span className="font-medium">{tank.totalReturned}</span>
                          </span>
                          <span className="text-sm font-medium text-orange-600">
                            Outstanding: {tank.outstanding}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTankDetails(false)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
