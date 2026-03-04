'use client';

import { useEffect, useState } from 'react';
import { Search, DollarSign, Users, Calendar, Plus, Edit, Check, X, Loader2 } from 'lucide-react';
import { db, type CustomerCreditSummary, type CreditPayment } from '@/lib/db-complete';

export default function CustomerCreditsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerCreditSummary[]>([]);
  const [payments, setPayments] = useState<{ [key: string]: CreditPayment[] }>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCreditSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const { data } = await db.analytics.getCustomerCreditSummary();
      const customerList = (data as CustomerCreditSummary[]) || [];
      setCustomers(customerList);

      // Fetch payment history for each customer
      const paymentsData: { [key: string]: CreditPayment[] } = {};
      for (const customer of customerList) {
        const { data: customerPayments } = await db.creditPayments.getAll(customer.customer_id);
        paymentsData[customer.customer_id] = (customerPayments as CreditPayment[]) || [];
      }
      setPayments(paymentsData);

      setLoading(false);
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.contact_number && customer.contact_number.includes(searchQuery))
  );

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    setProcessingPayment(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Record payment
      const { error } = await db.creditPayments.create({
        customer_id: selectedCustomer.customer_id,
        sale_id: null, // General payment
        amount_paid: amount,
        payment_method: 'Cash',
        notes: paymentNotes.trim() || null,
        recorded_by: null,
      });

      if (error) {
        // Provide more specific error message for trigger issues
        if (error.message?.includes('outstanding_credit') || error.message?.includes('column')) {
          throw new Error('Database trigger error: The system is trying to update a non-existent column. Please run the SQL fix script in supabase/fix_credit_payment_complete.sql');
        }
        throw error;
      }

      // Refresh data
      window.location.reload();
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(err.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTotalPaid = (customerId: string) => {
    return payments[customerId]?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer List (CL)</h1>
        <p className="text-gray-600">Manage customer credit loans and payments</p>
      </div>

      {/* Summary Card */}
      <div className="bg-linear-to-r from-orange-500 to-orange-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Total Outstanding Credit</p>
            <p className="text-3xl font-bold">
              ₱{customers.reduce((sum, c) => sum + c.outstanding_credit, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-orange-100 text-sm mt-1">
              Across {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Users className="h-8 w-8 text-orange-200" />
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

      {/* Payment Form Modal */}
      {showPaymentForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Record Payment - {selectedCustomer.customer_name}
            </h3>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outstanding Credit
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    ₱{selectedCustomer.outstanding_credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remaining Credit
                </label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900">
                    ₱{Math.max(0, selectedCustomer.outstanding_credit - parseFloat(paymentAmount || '0')).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Add payment notes..."
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedCustomer(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Record Payment'
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Credit Limit</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Outstanding</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Paid</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Last Credit</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'No customers match your search.' : 'No customers with outstanding credit.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const totalPaid = getTotalPaid(customer.customer_id);
                return (
                  <tr key={customer.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {customer.unpaid_transactions} unpaid transaction{customer.unpaid_transactions !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.contact_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        Credit Available
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        ₱{customer.outstanding_credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        ₱{totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {customer.last_credit_date ? new Date(customer.last_credit_date).toLocaleDateString('en-PH') : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowPaymentForm(true);
                            setPaymentAmount('');
                            setPaymentNotes('');
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <DollarSign className="h-4 w-4" />
                          Payment
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

      {/* Payment History */}
      {Object.keys(payments).length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payment History</h3>
          <div className="space-y-4">
            {Object.entries(payments).slice(0, 5).map(([customerId, customerPayments]) => {
              const customer = customers.find(c => c.customer_id === customerId);
              if (!customer) return null;
              
              return (
                <div key={customerId} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="font-medium text-gray-900 mb-2">{customer.customer_name}</p>
                  <div className="space-y-2">
                    {customerPayments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-900">₱{payment.amount_paid.toFixed(2)}</span>
                          <span className="text-gray-500 ml-2">
                            {new Date(payment.payment_date).toLocaleDateString('en-PH')}
                          </span>
                        </div>
                        <span className="text-gray-400">{payment.payment_method}</span>
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
