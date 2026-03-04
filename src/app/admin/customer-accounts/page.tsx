'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, PackageOpen, AlertTriangle, CheckCircle, CreditCard, ArrowLeft, Search, Filter } from 'lucide-react';
import { db, type Sale, type Customer, type CreditPayment, type EmptyTankReturn } from '@/lib/db';
import Link from 'next/link';

interface CustomerRecord {
  customerName: string;
  outstandingCredit: number;
  outstandingTanks: number;
  totalSales: number;
  lastSaleDate: string | null;
  lastSaleId: string | null;
  sales: Sale[];
}

export default function CustomerAccountsPage() {
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'tanks'>('all');
  const [editingRecord, setEditingRecord] = useState<CustomerRecord | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadCustomerRecords() {
      setLoading(true);
      try {
        // Get all sales and extract customer records
        const [salesRes] = await Promise.all([
          db.sales.getAll()
        ]);

        const salesList = (salesRes.data as Sale[]) || [];

        // Extract unique customers from sales
        const customerMap = new Map<string, CustomerRecord>();

        salesList.forEach(sale => {
          // Get customer name from notes only (no customer accounts)
          let customerName = '';
          if (sale.notes?.includes('Customer:')) {
            customerName = sale.notes.split('Customer:')[1]?.trim() || '';
          }

          if (!customerName) return;

          if (!customerMap.has(customerName)) {
            // Get customer's sales
            const customerSales = salesList.filter(s => 
              (s.notes?.includes('Customer:') && s.notes.split('Customer:')[1]?.trim() === customerName)
            );

            // Calculate outstanding credit (loans) - handle partial payments
            const creditSales = customerSales.filter(s => s.sale_type === 'credit');
            let outstandingCredit = 0;
            
            creditSales.forEach(sale => {
              const saleAmount = sale.total_amount || 0;
              
              if (sale.is_credit_paid) {
                // Fully paid - no outstanding amount
                return;
              }
              
              // Check for partial payments in notes
              const notes = sale.notes || '';
              const paymentMatch = notes.match(/PARTIAL PAYMENT:\s*₱(\d+(?:\.\d{2})?)\s*paid.*Remaining:\s*₱(\d+(?:\.\d{2})?)/);
              
              if (paymentMatch) {
                // Has partial payment - use remaining amount
                const remainingAmount = parseFloat(paymentMatch[2]);
                outstandingCredit += remainingAmount;
              } else {
                // No payments recorded - full amount outstanding
                outstandingCredit += saleAmount;
              }
            });

            // Calculate outstanding tanks
            const totalBorrowed = customerSales.reduce((sum, s) => sum + (s.empty_tanks_borrowed || 0), 0);
            const totalReturned = customerSales.reduce((sum, s) => sum + (s.empty_tanks_returned || 0), 0);
            const outstandingTanks = totalBorrowed - totalReturned;

            // Get last sale
            const sortedSales = customerSales.sort((a, b) => 
              new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime()
            );
            const lastSale = sortedSales[0];

            customerMap.set(customerName, {
              customerName,
              outstandingCredit,
              outstandingTanks,
              totalSales: customerSales.length,
              lastSaleDate: lastSale?.sold_at || null,
              lastSaleId: lastSale?.id || null,
              sales: customerSales
            });
          }
        });

        setCustomerRecords(Array.from(customerMap.values()));
      } catch (err) {
        console.error('Failed to load customer records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomerRecords();
  }, []);

  const filteredRecords = customerRecords.filter(record => {
    const matchesSearch = record.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'credit') {
      return matchesSearch && record.outstandingCredit > 0;
    } else if (filterType === 'tanks') {
      return matchesSearch && record.outstandingTanks > 0;
    }
    return matchesSearch;
  });

  const handlePaymentUpdate = async (record: CustomerRecord, amount: number) => {
    if (amount <= 0) return;

    setUpdating(true);
    try {
      // Find unpaid credit sales for this customer
      const unpaidSales = record.sales.filter(s => s.sale_type === 'credit' && !s.is_credit_paid);
      
      // Process payments in order of oldest sales first
      let remainingAmount = amount;
      
      for (const sale of unpaidSales) {
        if (remainingAmount <= 0) break;
        
        const saleAmount = sale.total_amount || 0;
        
        if (remainingAmount >= saleAmount) {
          // Full payment for this sale
          await db.sales.update(sale.id, {
            is_credit_paid: true,
            notes: `${sale.notes} - PAID IN FULL: ₱${saleAmount} on ${new Date().toLocaleDateString()}`
          });
          remainingAmount -= saleAmount;
        } else {
          // Partial payment - add payment info to notes but don't mark as fully paid
          await db.sales.update(sale.id, {
            notes: `${sale.notes} - PARTIAL PAYMENT: ₱${remainingAmount} paid on ${new Date().toLocaleDateString()}, Remaining: ₱${saleAmount - remainingAmount}`
          });
          remainingAmount = 0;
        }
      }

      // Refresh data
      await loadCustomerRecords();
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setUpdating(false);
      setEditingRecord(null);
    }
  };

  const handleTankReturn = async (record: CustomerRecord, tankCount: number) => {
    if (tankCount <= 0) return;

    setUpdating(true);
    try {
      // Find sales with outstanding tanks for this customer
      const salesWithOutstandingTanks = record.sales.filter(s => 
        (s.empty_tanks_borrowed || 0) > (s.empty_tanks_returned || 0)
      );
      
      // Update the most recent sale with tank return
      if (salesWithOutstandingTanks.length > 0) {
        const sale = salesWithOutstandingTanks[0];
        const newReturned = (sale.empty_tanks_returned || 0) + tankCount;
        
        await db.sales.update(sale.id, {
          empty_tanks_returned: Math.min(newReturned, sale.empty_tanks_borrowed || 0),
          notes: `${sale.notes} - TANK RETURN: ${tankCount} tanks on ${new Date().toLocaleDateString()}`
        });
      }

      // Refresh data
      await loadCustomerRecords();
    } catch (err) {
      console.error('Failed to record tank return:', err);
    } finally {
      setUpdating(false);
      setEditingRecord(null);
    }
  };

  const loadCustomerRecords = async () => {
    try {
      const [salesRes] = await Promise.all([
        db.sales.getAll()
      ]);

      const salesList = (salesRes.data as Sale[]) || [];

      const customerMap = new Map<string, CustomerRecord>();

      salesList.forEach(sale => {
        // Get customer name from notes only (no customer accounts)
        let customerName = '';
        if (sale.notes?.includes('Customer:')) {
          customerName = sale.notes.split('Customer:')[1]?.trim() || '';
        }

        if (!customerName) return;

        if (!customerMap.has(customerName)) {
          // Get customer's sales
          const customerSales = salesList.filter(s => 
            (s.notes?.includes('Customer:') && s.notes.split('Customer:')[1]?.trim() === customerName)
          );

          // Calculate outstanding credit (loans) - handle partial payments
          const creditSales = customerSales.filter(s => s.sale_type === 'credit');
          let outstandingCredit = 0;
          
          creditSales.forEach(sale => {
            const saleAmount = sale.total_amount || 0;
            
            if (sale.is_credit_paid) {
              // Fully paid - no outstanding amount
              return;
            }
            
            // Check for partial payments in notes
            const notes = sale.notes || '';
            const paymentMatch = notes.match(/PARTIAL PAYMENT:\s*₱(\d+(?:\.\d{2})?)\s*paid.*Remaining:\s*₱(\d+(?:\.\d{2})?)/);
            
            if (paymentMatch) {
              // Has partial payment - use remaining amount
              const remainingAmount = parseFloat(paymentMatch[2]);
              outstandingCredit += remainingAmount;
            } else {
              // No payments recorded - full amount outstanding
              outstandingCredit += saleAmount;
            }
          });

          // Calculate outstanding tanks
          const totalBorrowed = customerSales.reduce((sum, s) => sum + (s.empty_tanks_borrowed || 0), 0);
          const totalReturned = customerSales.reduce((sum, s) => sum + (s.empty_tanks_returned || 0), 0);
          const outstandingTanks = totalBorrowed - totalReturned;

          // Get last sale
          const sortedSales = customerSales.sort((a, b) => 
            new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime()
          );
          const lastSale = sortedSales[0];

          customerMap.set(customerName, {
            customerName,
            outstandingCredit,
            outstandingTanks,
            totalSales: customerSales.length,
            lastSaleDate: lastSale?.sold_at || null,
            lastSaleId: lastSale?.id || null,
            sales: customerSales
          });
        }
      });

      setCustomerRecords(Array.from(customerMap.values()));
    } catch (err) {
      console.error('Failed to refresh customer records:', err);
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin/dashboard"
            className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Records</h1>
            <p className="text-gray-600">Track customers with outstanding credit payments and tank returns</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'credit' | 'tanks')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Records</option>
              <option value="credit">Outstanding Credit</option>
              <option value="tanks">Outstanding Tanks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Record Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map((record) => (
          <div key={record.customerName} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            {/* Customer Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{record.customerName}</h3>
                  <p className="text-sm text-gray-500">
                    {record.totalSales} sales • Last: {record.lastSaleDate ? 
                      new Date(record.lastSaleDate).toLocaleDateString('en-PH') : 'No sales'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Outstanding Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${
                record.outstandingCredit > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Outstanding Credit</span>
                </div>
                <p className={`text-lg font-bold ${
                  record.outstandingCredit > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  ₱{record.outstandingCredit.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                record.outstandingTanks > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <PackageOpen className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Outstanding Tanks</span>
                </div>
                <p className={`text-lg font-bold ${
                  record.outstandingTanks > 0 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {record.outstandingTanks}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {record.outstandingCredit > 0 && (
                <button
                  onClick={() => setEditingRecord(record)}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </button>
              )}
              {record.outstandingTanks > 0 && (
                <button
                  onClick={() => setEditingRecord(record)}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PackageOpen className="h-4 w-4" />
                  Record Tank Return
                </button>
              )}
              {record.outstandingCredit === 0 && record.outstandingTanks === 0 && (
                <div className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">All Clear</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No customer records found matching your search.' : 
             filterType === 'credit' ? 'No customers with outstanding credit.' :
             filterType === 'tanks' ? 'No customers with outstanding tanks.' :
             'No customer records found.'}
          </p>
        </div>
      )}

      {/* Action Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRecord.outstandingCredit > 0 ? 'Record Payment' : 'Record Tank Return'}
            </h3>
            
            {editingRecord.outstandingCredit > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-bold">{editingRecord.customerName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Outstanding Credit: <span className="font-bold text-red-600">₱{editingRecord.outstandingCredit.toFixed(2)}</span>
                </p>
                <input
                  type="number"
                  min="0.01"
                  max={editingRecord.outstandingCredit}
                  step="0.01"
                  placeholder={`Enter payment amount (max: ₱${editingRecord.outstandingCredit.toFixed(2)})`}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  id="payment-amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Partial payments allowed. Remaining balance will be tracked.
                </p>
              </div>
            )}

            {editingRecord.outstandingTanks > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-bold">{editingRecord.customerName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Outstanding Tanks: <span className="font-bold text-orange-600">{editingRecord.outstandingTanks}</span>
                </p>
                <input
                  type="number"
                  placeholder="Enter tank count"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  id="tank-count"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingRecord.outstandingCredit > 0) {
                    const amountInput = document.getElementById('payment-amount') as HTMLInputElement;
                    const amount = parseFloat(amountInput.value) || 0;
                    handlePaymentUpdate(editingRecord, amount);
                  } else if (editingRecord.outstandingTanks > 0) {
                    const tankInput = document.getElementById('tank-count') as HTMLInputElement;
                    const tankCount = parseInt(tankInput.value) || 0;
                    handleTankReturn(editingRecord, tankCount);
                  }
                  setEditingRecord(null);
                }}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                disabled={updating}
              >
                {updating ? 'Processing...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
