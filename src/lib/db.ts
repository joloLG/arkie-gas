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
  description: string | null;
  current_price: number;
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
  quantity: number;
  unit_price: number; // Price at time of sale (snapshot)
  total_amount: number;
  sold_by: string | null;
  sold_at: string;
  notes: string | null;
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
        .select('*, products(name)')
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
      
      // Calculate total based on current unit price
      const total_amount = sale.unit_price * sale.quantity;
      
      const { data, error } = await supabase
        .from('sales')
        .insert({ ...sale, total_amount })
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
