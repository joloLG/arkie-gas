'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, Phone, DollarSign, Edit, Trash2, PackageOpen, AlertCircle } from "lucide-react";
import Link from 'next/link';
import { db, type Customer, type CreditPayment, type EmptyTankReturn } from '@/lib/db';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditPayments, setCreditPayments] = useState<{ [key: string]: CreditPayment[] }>({});
  const [tankReturns, setTankReturns] = useState<{ [key: string]: EmptyTankReturn[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const { data, error } = await db.customers.getAll();
      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        const customerList = (data as Customer[]) || [];
        setCustomers(customerList);

        // Fetch credit payments and tank returns for each customer
        const paymentsData: { [key: string]: CreditPayment[] } = {};
        const returnsData: { [key: string]: EmptyTankReturn[] } = {};

        for (const customer of customerList) {
          const [paymentsResult, returnsResult] = await Promise.all([
            db.creditPayments.getAll(customer.id),
            db.emptyTankReturns.getAll(customer.id)
          ]);
          
          paymentsData[customer.id] = (paymentsResult.data as CreditPayment[]) || [];
          returnsData[customer.id] = (returnsResult.data as EmptyTankReturn[]) || [];
        }

        setCreditPayments(paymentsData);
        setTankReturns(returnsData);
      }
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.contact_number && customer.contact_number.includes(searchTerm))
  );

  const getCustomerCreditSummary = (customerId: string) => {
    const payments = creditPayments[customerId] || [];
    const returns = tankReturns[customerId] || [];
    
    const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalTanksReturned = returns.reduce((sum, r) => sum + r.quantity_returned, 0);
    
    return {
      totalPaid,
      totalTanksReturned,
      paymentCount: payments.length,
      returnCount: returns.length
    };
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    const { error } = await db.customers.delete(id);
    if (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    } else {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link
          href="/admin/customers/new"
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Customer Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/customers/new"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const creditSummary = getCustomerCreditSummary(customer.id);
            return (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  {customer.contact_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Phone className="h-3 w-3" />
                      {customer.contact_number}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/customers/${customer.id}/edit`}
                    className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {customer.address && (
                <p className="text-sm text-gray-600 mb-3">{customer.address}</p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Credit Limit</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₱{customer.credit_limit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Current Credit</span>
                  <span className={`text-sm font-medium ${
                    customer.total_credit > customer.credit_limit ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    ₱{customer.total_credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Available Credit</span>
                  <span className="text-sm font-medium text-green-600">
                    ₱{Math.max(0, customer.credit_limit - customer.total_credit).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Credit Payments Summary */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Credit Activity</h4>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      ₱{creditSummary.totalPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-gray-500">({creditSummary.paymentCount} payments)</span>
                  </div>
                </div>
              </div>

              {/* Empty Tank Returns Summary */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600">
                      {creditSummary.totalTanksReturned} tanks returned
                    </span>
                    <span className="text-xs text-gray-500">({creditSummary.returnCount} returns)</span>
                  </div>
                  {creditSummary.totalTanksReturned === 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">No tanks returned</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {customer.total_credit > 0 && (
                    <Link
                      href={`/admin/customers/${customer.id}/credits`}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      View Credits
                    </Link>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
