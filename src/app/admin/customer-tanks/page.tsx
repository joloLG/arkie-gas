'use client';

import { useEffect, useState } from 'react';
import { Search, PackageOpen, Users, Calendar, Plus, Edit, Check, X, Loader2 } from 'lucide-react';
import { db, type CustomerTankSummary, type TankReturn } from '@/lib/db-complete';

export default function CustomerTanksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerTankSummary[]>([]);
  const [returns, setReturns] = useState<{ [key: string]: TankReturn[] }>({});
  const [loading, setLoading] = useState(true);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerTankSummary | null>(null);
  const [returnQuantity, setReturnQuantity] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const { data } = await db.analytics.getCustomerTankSummary();
      const customerList = (data as CustomerTankSummary[]) || [];
      setCustomers(customerList);

      // Fetch return history for each customer
      const returnsData: { [key: string]: TankReturn[] } = {};
      for (const customer of customerList) {
        const { data: customerReturns } = await db.tankReturns.getAll(customer.customer_id);
        returnsData[customer.customer_id] = (customerReturns as TankReturn[]) || [];
      }
      setReturns(returnsData);

      setLoading(false);
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.contact_number && customer.contact_number.includes(searchQuery))
  );

  const handleTankReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !returnQuantity) return;

    setProcessingReturn(true);
    try {
      const quantity = parseInt(returnQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Invalid return quantity');
      }

      if (quantity > selectedCustomer.outstanding_tanks) {
        throw new Error('Return quantity cannot exceed outstanding tanks');
      }

      // Record tank return
      const { error } = await db.tankReturns.create({
        customer_id: selectedCustomer.customer_id,
        sale_id: null, // General return
        product_id: selectedCustomer.product_id || null, // Use actual product_id or null
        quantity_returned: quantity,
        notes: returnNotes.trim() || null,
        recorded_by: null,
      });

      if (error) throw error;

      // Refresh data
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to process tank return');
    } finally {
      setProcessingReturn(false);
    }
  };

  const getTotalReturned = (customerId: string) => {
    return returns[customerId]?.reduce((sum, r) => sum + r.quantity_returned, 0) || 0;
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer List (TR)</h1>
        <p className="text-gray-600">Manage customer empty tank returns</p>
      </div>

      {/* Summary Card */}
      <div className="bg-linear-to-r from-red-500 to-red-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm">Total Unreturned Tanks</p>
            <p className="text-3xl font-bold">
              {customers.reduce((sum, c) => sum + c.outstanding_tanks, 0)} tanks
            </p>
            <p className="text-red-100 text-sm mt-1">
              Across {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <PackageOpen className="h-8 w-8 text-red-200" />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Tank Return Form Modal */}
      {showReturnForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Record Tank Return - {selectedCustomer.customer_name}
            </h3>
            
            <form onSubmit={handleTankReturn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outstanding Tanks
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedCustomer.outstanding_tanks} tanks
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomer.outstanding_tanks}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remaining Tanks
                </label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900">
                    {Math.max(0, selectedCustomer.outstanding_tanks - parseInt(returnQuantity || '0'))} tanks
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Add return notes..."
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnForm(false);
                    setSelectedCustomer(null);
                    setReturnQuantity('');
                    setReturnNotes('');
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReturn}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {processingReturn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Record Return'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Borrowed</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Returned</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Outstanding</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Transaction</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'No customers match your search.' : 'No customers with outstanding tanks.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const totalReturned = getTotalReturned(customer.customer_id);
                return (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {customer.transactions_with_tanks} transaction{customer.transactions_with_tanks !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.contact_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.outstanding_tanks + getTotalReturned(customer.customer_id)} tanks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        {totalReturned} tanks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        {customer.outstanding_tanks} tanks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {customer.last_transaction_date ? new Date(customer.last_transaction_date).toLocaleDateString('en-PH') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowReturnForm(true);
                            setReturnQuantity('');
                            setReturnNotes('');
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <PackageOpen className="h-4 w-4" />
                          Return
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Return History */}
      {Object.keys(returns).length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Return History</h3>
          <div className="space-y-4">
            {Object.entries(returns).slice(0, 5).map(([customerId, customerReturns]) => {
              const customer = customers.find(c => c.customer_id === customerId);
              if (!customer) return null;
              
              return (
                <div key={customerId} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="font-medium text-gray-900 mb-2">{customer.customer_name}</p>
                  <div className="space-y-2">
                    {customerReturns.slice(0, 3).map((returnRecord) => (
                      <div key={returnRecord.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-900">{returnRecord.quantity_returned} tanks</span>
                          <span className="text-gray-500 ml-2">
                            {new Date(returnRecord.return_date).toLocaleDateString('en-PH')}
                          </span>
                        </div>
                        <span className="text-gray-400">Returned</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
