// ============================================
// TypeScript Types - Repuestos Sotomayor
// ============================================

export interface Category {
  id: string;
  name: string;
  section: string;
  created_at?: string;
}

export interface Fitment {
  make: string;
  model: string;
  year: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category_id: string | null;
  brand_id: string | null;
  cost: number;
  price_usd: number;
  image_url?: string;
  image_urls?: string[];
  location?: string;
  fitment?: Fitment[];
  stock?: number;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  categories?: Category;
  brands?: Brand;
  kit_items?: { kit_id: string }[];
}

export interface Setting {
  key: string;
  value: number;
  updated_at?: string;
}

export interface Quote {
  id: string;
  client_name: string;
  client_phone: string;
  total_usd: number;
  bcv_rate: number;
  status: string;
  notes?: string;
  created_at?: string;
  quote_items?: QuoteItem[];
}

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id?: string | null;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit_price_usd: number;
  brand_name?: string;
  brand_logo_url?: string;
}

// Cart item extends QuoteItem with product info for display
export interface CartItem extends QuoteItem {
  product_id: string;
  product_code: string;
  image_url?: string;
  brand_name?: string;
  brand_logo_url?: string;
  stock?: number;
}

// For the product table display
export interface ProductWithBs extends Product {
  price_bs: number;
}

export interface Kit {
  id: string;
  name: string;
  category: string;
  description?: string;
  vehicle_brand_id?: string;
  image_urls?: string[];
  price_verified?: boolean;
  price_verified_at?: string;
  created_at?: string;
  kit_items?: KitItem[];
  vehicle_brands?: VehicleBrand;
}

export interface KitItem {
  id: string;
  kit_id: string;
  product_id: string;
  quantity: number;
  products?: Product; // Supabase joined relation usually uses plural or singular based on FK
}

export interface KitCombo {
  id: string;
  kit_id: string;
  name: string;
  created_at?: string;
  kit_combo_items?: KitComboItem[];
}

export interface KitComboItem {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  products?: Product;
}

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  created_at?: string;
}

export interface VehicleBrand {
  id: string;
  name: string;
  logo_url?: string;
  created_at?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_cost: number;
  new_cost: number;
  old_price_usd: number;
  new_price_usd: number;
  old_name?: string;
  new_name?: string;
  old_description?: string;
  new_description?: string;
  change_type?: string; // 'price' | 'name' | 'description' | 'all'
  changed_at: string;
}
