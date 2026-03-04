'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Users } from "lucide-react";
import Link from 'next/link';
import { db, type Customer } from '@/lib/db';

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    address: '',
    credit_limit: 0,
    total_credit: 0,
    is_active: true
  });

  useEffect(() => {
    async function fetchCustomer() {
      const { data, error } = await db.customers.getById(params.id);
      if (error) {
        console.error('Error fetching customer:', error);
        router.push('/admin/customers');
      } else {
        const customerData = data as Customer;
        setCustomer(customerData);
        setFormData({
          name: customerData.name,
          contact_number: customerData.contact_number || '',
          address: customerData.address || '',
          credit_limit: customerData.credit_limit,
          total_credit: customerData.total_credit,
          is_active: customerData.is_active
        });
      }
      setLoading(false);
    }
    fetchCustomer();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await db.customers.update(params.id, formData);
      if (error) {
        console.error('Error updating customer:', error);
        alert('Failed to update customer');
      } else {
        router.push('/admin/customers');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Customer not found</h3>
        <Link
          href="/admin/customers"
          className="text-orange-500 hover:text-orange-600"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/customers"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number
            </label>
            <input
              type="tel"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="09XXXXXXXXX"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter customer address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700 mb-2">
                Credit Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₱</span>
                <input
                  type="number"
                  id="credit_limit"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="total_credit" className="block text-sm font-medium text-gray-700 mb-2">
                Current Credit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₱</span>
                <input
                  type="number"
                  id="total_credit"
                  name="total_credit"
                  value={formData.total_credit}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Available Credit</span>
              <span className={`text-sm font-medium ${
                formData.total_credit > formData.credit_limit ? 'text-red-600' : 'text-green-600'
              }`}>
                ₱{Math.max(0, formData.credit_limit - formData.total_credit).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {formData.total_credit > formData.credit_limit && (
              <p className="text-xs text-red-600">Customer is over credit limit</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active customer
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Updating...' : 'Update Customer'}
            </button>
            <Link
              href="/admin/customers"
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
