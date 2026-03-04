import { createClient } from '@/utils/supabase/client';

// Database types based on complete schema
export type User = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  description: string | null;
  base_price: number;
  current_selling_price: number;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  contact_number: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  customer_id: string | null;
  product_id: string;
  quantity: number;
  base_price: number;
  selling_price: number;
  customer_price: number;
  total_amount: number;
  profit: number;
  payment_type: 'cash' | 'credit';
  is_credit_paid: boolean;
  credit_balance: number;
  empty_tanks_returned: number;
  empty_tanks_borrowed: number;
  tanks_outstanding: number;
  notes: string | null;
  sold_by: string | null;
  sold_at: string;
};

export type CreditPayment = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type TankReturn = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  product_id: string;
  quantity_returned: number;
  return_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

// Analytics types
export type DailySalesSummary = {
  sale_date: string;
  transaction_count: number;
  total_quantity: number;
  total_sales: number;
  total_profit: number;
  credit_sales: number;
  cash_sales: number;
  total_tanks_outstanding: number;
};

export type CustomerCreditSummary = {
  customer_id: string;
  customer_name: string;
  contact_number: string | null;
  outstanding_credit: number;
  unpaid_transactions: number;
  last_credit_date: string;
};

export type CustomerTankSummary = {
  customer_id: string;
  customer_name: string;
  contact_number: string | null;
  outstanding_tanks: number;
  transactions_with_tanks: number;
  last_transaction_date: string;
};

export type ProductPerformanceSummary = {
  product_id: string;
  brand: string;
  product_name: string;
  stock_quantity: number;
  total_transactions: number;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  avg_selling_price: number;
  last_sale_date: string;
};

// Client-side database helper
export const db = {
  // Products
  products: {
    getAll: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('brand', { ascending: true })
        .order('name', { ascending: true });
      return { data, error };
    },
    
    getById: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
    
    create: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      return { data, error };
    },
    
    update: async (id: string, updates: Partial<Product>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    
    delete: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      return { error };
    },
    
    adjustStock: async (id: string, adjustment: number, reason: string) => {
      const supabase = createClient();
      
      // Get current stock
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', id)
        .single();
      
      if (!product) return { error: new Error('Product not found') };
      
      const previousStock = product.stock_quantity;
      const newStock = previousStock + adjustment;
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', id);
      
      if (updateError) return { error: updateError };
      
      // Record inventory movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: id,
          movement_type: adjustment > 0 ? 'in' : adjustment < 0 ? 'out' : 'adjustment',
          quantity: Math.abs(adjustment),
          previous_stock: previousStock,
          new_stock: newStock,
          reason,
        })
        .select()
        .single();
      
      return { data, error };
    },
  },
  
  // Customers
  customers: {
    getAll: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      return { data, error };
    },
    
    getById: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
    
    create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      return { data, error };
    },
    
    update: async (id: string, updates: Partial<Customer>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    
    delete: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id);
      return { error };
    },
  },
  
  // Sales
  sales: {
    getAll: async (startDate?: string, endDate?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('sales')
        .select(`
          *,
          products (brand, name),
          customers (name)
        `)
        .order('sold_at', { ascending: false });
      
      if (startDate) {
        query = query.gte('sold_at', startDate);
      }
      if (endDate) {
        query = query.lte('sold_at', endDate);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    getById: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          products (brand, name),
          customers (name, contact_number)
        `)
        .eq('id', id)
        .single();
      return { data, error };
    },
    
    create: async (sale: Omit<Sale, 'id' | 'total_amount' | 'profit' | 'tanks_outstanding' | 'credit_balance' | 'sold_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sales')
        .insert(sale)
        .select(`
          *,
          products (brand, name),
          customers (name)
        `)
        .single();
      return { data, error };
    },
    
    update: async (id: string, updates: Partial<Sale>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          products (brand, name),
          customers (name)
        `)
        .single();
      return { data, error };
    },
  },
  
  // Credit Payments
  creditPayments: {
    getAll: async (customerId?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('credit_payments')
        .select(`
          *,
          customers (name),
          sales (total_amount)
        `)
        .order('payment_date', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    create: async (payment: Omit<CreditPayment, 'id' | 'payment_date' | 'created_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('credit_payments')
        .insert(payment)
        .select(`
          *,
          customers (name)
        `)
        .single();
      return { data, error };
    },
  },
  
  // Tank Returns
  tankReturns: {
    getAll: async (customerId?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('tank_returns')
        .select(`
          *,
          customers (name),
          products (brand, name)
        `)
        .order('return_date', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    create: async (tankReturn: Omit<TankReturn, 'id' | 'return_date' | 'created_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tank_returns')
        .insert(tankReturn)
        .select(`
          *,
          customers (name),
          products (brand, name)
        `)
        .single();
      return { data, error };
    },
  },
  
  // Analytics
  analytics: {
    getDailySummary: async (date?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('daily_sales_summary')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (date) {
        query = query.eq('sale_date', date);
      } else {
        query = query.limit(30); // Last 30 days
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    getMonthlySummary: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('monthly_sales_summary')
        .select('*')
        .order('sale_month', { ascending: false })
        .limit(12); // Last 12 months
      
      return { data, error };
    },
    
    getYearlySummary: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('yearly_sales_summary')
        .select('*')
        .order('sale_year', { ascending: false });
      
      return { data, error };
    },
    
    getCustomerCreditSummary: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customer_credit_summary')
        .select('*')
        .order('outstanding_credit', { ascending: false });
      
      return { data, error };
    },
    
    getCustomerTankSummary: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customer_tank_summary')
        .select('*')
        .order('outstanding_tanks', { ascending: false });
      
      return { data, error };
    },
    
    getProductPerformance: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_performance_summary')
        .select('*')
        .order('total_revenue', { ascending: false });
      
      return { data, error };
    },
    
    getDashboardStats: async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];
      
      const [todayResult, creditResult, tankResult, productResult] = await Promise.all([
        // Today's sales
        supabase
          .from('daily_sales_summary')
          .select('*')
          .eq('sale_date', today)
          .single(),
        
        // Total outstanding credit
        supabase
          .from('customer_credit_summary')
          .select('outstanding_credit'),
        
        // Total outstanding tanks
        supabase
          .from('customer_tank_summary')
          .select('outstanding_tanks'),
        
        // Total available tanks
        supabase
          .from('products')
          .select('stock_quantity')
          .eq('is_active', true)
      ]);
      
      const todayData = todayResult.data;
      const totalCredit = creditResult.data?.reduce((sum: number, item: any) => sum + item.outstanding_credit, 0) || 0;
      const totalTanks = tankResult.data?.reduce((sum: number, item: any) => sum + item.outstanding_tanks, 0) || 0;
      const availableTanks = productResult.data?.reduce((sum: number, item: any) => sum + item.stock_quantity, 0) || 0;
      
      return {
        todaySales: todayData?.total_sales || 0,
        todayProfit: todayData?.total_profit || 0,
        totalCredit,
        totalTanks,
        availableTanks,
      };
    },
  },
};

// Connection test
export const testConnection = async () => {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Database connection failed:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('Database connection successful');
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Database connection failed:', message);
    return { success: false, error: message };
  }
};
