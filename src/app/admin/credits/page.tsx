'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Users, Plus, Calendar, CreditCard } from "lucide-react";
import Link from 'next/link';
import { db, type CreditPayment, type Customer } from '@/lib/db';

interface CreditPaymentWithDetails extends CreditPayment {
  customers: { name: string } | null;
  sales: { total_amount: number } | null;
}

export default function CreditsPage() {
  const [payments, setPayments] = useState<CreditPaymentWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    customer_id: '',
    sale_id: '',
    amount_paid: 0,
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    async function fetchData() {
      const [paymentsResult, customersResult] = await Promise.all([
        db.creditPayments.getAll(),
        db.customers.getAll()
      ]);
      
      setPayments((paymentsResult.data as CreditPaymentWithDetails[]) || []);
      setCustomers((customersResult.data as Customer[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await db.creditPayments.create({
      customer_id: newPayment.customer_id,
      sale_id: newPayment.sale_id,
      amount_paid: newPayment.amount_paid,
      payment_method: newPayment.payment_method || null,
      notes: newPayment.notes || null,
      created_by: null
    });

    if (error) {
      alert('Failed to record payment: ' + error.message);
    } else {
      // Refresh payments list
      const { data } = await db.creditPayments.getAll();
      setPayments((data as CreditPaymentWithDetails[]) || []);
      
      // Reset form
      setNewPayment({
        customer_id: '',
        sale_id: '',
        amount_paid: 0,
        payment_method: '',
        notes: ''
      });
      setShowAddPayment(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);

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
          <CreditCard className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Credit Payments</h1>
        </div>
        <button
          onClick={() => setShowAddPayment(!showAddPayment)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Payments Recorded</p>
              <p className="text-2xl font-bold text-gray-900">
                ₱{totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Payment Count</p>
            <p className="text-lg font-semibold text-gray-900">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Add Payment Form */}
      {showAddPayment && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Record New Payment</h3>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  value={newPayment.customer_id}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, customer_id: e.target.value }))}
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
                  Payment Method
                </label>
                <input
                  type="text"
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Cash, Bank Transfer, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPayment.amount_paid}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale ID (Optional)
                </label>
                <input
                  type="text"
                  value={newPayment.sale_id}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, sale_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Link to specific sale"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Payment notes..."
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setShowAddPayment(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments recorded yet</h3>
              <p className="text-gray-500 mb-4">Start by recording your first credit payment</p>
              <button
                onClick={() => setShowAddPayment(true)}
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.customers?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ₱{payment.amount_paid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    {payment.payment_method && (
                      <p className="text-xs text-gray-500">{payment.payment_method}</p>
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
