import { createClient } from '@/utils/supabase/client';

// Database types based on schema
export type User = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  base_price: number; // Changed from bought_price to match database
  current_selling_price: number; // Changed from current_price to match database
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PriceHistory = {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
  changed_by: string | null;
};

export type Sale = {
  id: string;
  product_id: string;
  customer_id: string | null;
  quantity: number;
  unit_price: number;
  bought_price: number;
  total_amount: number;
  profit: number;
  empty_tanks_returned: number;
  empty_tanks_borrowed: number;
  sale_type: 'cash' | 'credit';
  credit_amount: number;
  is_credit_paid: boolean;
  sold_by: string | null;
  sold_at: string;
  notes: string | null;
};

export type Customer = {
  id: string;
  name: string;
  contact_number: string | null;
  address: string | null;
  total_credit: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreditPayment = {
  id: string;
  sale_id: string;
  customer_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
};

export type EmptyTankReturn = {
  id: string;
  sale_id: string | null;
  customer_id: string;
  product_id: string;
  quantity_returned: number;
  return_date: string;
  notes: string | null;
  created_by: string | null;
};

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'empty_tank_in' | 'empty_tank_out';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
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
        .order('created_at', { ascending: false });
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
        .delete()
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
        .select('*, products(name, brand), customers(name)')
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
    
    create: async (sale: Omit<Sale, 'id' | 'sold_at'>) => {
      const supabase = createClient();
      
      // Calculate total and profit
      const total_amount = sale.unit_price * sale.quantity;
      const profit = (sale.unit_price - sale.bought_price) * sale.quantity;
      
      const { data, error } = await supabase
        .from('sales')
        .insert({ ...sale, total_amount, profit })
        .select()
        .single();
      return { data, error };
    },
    
    update: async (id: string, updates: Partial<Sale>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    
    getDailySummary: async (date: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('sale_date', date);
      return { data, error };
    },
    
    getMonthlySummary: async (year: number, month: number) => {
      const supabase = createClient();
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
      
      const { data, error } = await supabase
        .from('monthly_sales_summary')
        .select('*')
        .gte('sale_month', startDate)
        .lt('sale_month', endDate);
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
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Credit Payments
  creditPayments: {
    getAll: async (customerId?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('credit_payments')
        .select('*, customers(name), sales(total_amount)')
        .order('payment_date', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    create: async (payment: Omit<CreditPayment, 'id' | 'payment_date'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('credit_payments')
        .insert(payment)
        .select()
        .single();
      return { data, error };
    },
  },

  // Empty Tank Returns
  emptyTankReturns: {
    getAll: async (customerId?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('empty_tank_returns')
        .select('*, customers(name), products(name, brand)')
        .order('return_date', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    create: async (returnRecord: Omit<EmptyTankReturn, 'id' | 'return_date'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('empty_tank_returns')
        .insert(returnRecord)
        .select()
        .single();
      return { data, error };
    },
  },
  
  // Price History
  priceHistory: {
    getByProduct: async (productId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('price_history_detailed')
        .select('*')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false });
      return { data, error };
    },
    
    getAll: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('price_history_detailed')
        .select('*')
        .order('changed_at', { ascending: false });
      return { data, error };
    },
  },
  
  // Inventory
  inventory: {
    getMovements: async (productId?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('inventory_movements')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    adjustStock: async (
      productId: string, 
      adjustmentQty: number, 
      reason: string,
      userId?: string
    ) => {
      const supabase = createClient();
      
      // Get current stock
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();
      
      if (!product) return { error: new Error('Product not found') };
      
      const previousStock = product.stock_quantity;
      const newStock = previousStock + adjustmentQty;
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);
      
      if (updateError) return { error: updateError };
      
      // Record movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          movement_type: adjustmentQty > 0 ? 'in' : adjustmentQty < 0 ? 'out' : 'adjustment',
          quantity: Math.abs(adjustmentQty),
          previous_stock: previousStock,
          new_stock: newStock,
          reason,
          created_by: userId || null,
        })
        .select()
        .single();
      
      return { data, error };
    },
  },
  
  // Analytics
  analytics: {
    getMostBoughtProducts: async (limit: number = 10) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('most_bought_products')
        .select('*')
        .limit(limit);
      return { data, error };
    },
    
    getYearlySummary: async (year: number) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('yearly_sales_summary')
        .select('*')
        .eq('sale_year', `${year}-01-01`);
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
    
    getEmptyTankSummary: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('empty_tank_summary')
        .select('*')
        .order('outstanding_empty_tanks', { ascending: false });
      return { data, error };
    },
    
    getProfitAnalysis: async (startDate?: string, endDate?: string) => {
      const supabase = createClient();
      let query = supabase
        .from('profit_analysis')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (startDate) {
        query = query.gte('sale_date', startDate);
      }
      if (endDate) {
        query = query.lte('sale_date', endDate);
      }
      
      const { data, error } = await query;
      return { data, error };
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
