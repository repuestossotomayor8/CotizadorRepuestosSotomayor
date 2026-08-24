'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product, Category, Setting, Quote, QuoteItem } from '@/types';

// ========== Products ==========
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const allProducts: Product[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(*), brands(*), kit_items(kit_id)')
          .order('code', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allProducts.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allProducts;
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Partial<Product> & { id: string, compatible_kits?: string[] }) => {
      const { id, categories, created_at, compatible_kits, brands, kit_items, ...updateData } = product as any;
      const { data, error } = await supabase
        .from('products')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, categories(*), brands(*), kit_items(kit_id)')
        .single();
      if (error) throw error;

      if (compatible_kits) {
        // Sync kits: delete all current
        await supabase.from('kit_items').delete().eq('product_id', id);
        // Insert new ones
        if (compatible_kits.length > 0) {
          const uniqueKitIds = Array.from(new Set<string>(compatible_kits as string[]));
          const insertData = uniqueKitIds.map((kitId: string) => ({
            kit_id: kitId,
            product_id: id,
            quantity: 1,
          }));
          await supabase.from('kit_items').insert(insertData);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['kit_items'] });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories' | 'brands' | 'kit_items'>, compatible_kits?: string[] }) => {
      const { data, error } = await supabase
        .from('products')
        .insert(payload.product)
        .select('*, categories(*), brands(*)')
        .single();
      if (error) throw error;

      if (payload.compatible_kits && payload.compatible_kits.length > 0) {
        const uniqueKitIds = Array.from(new Set<string>(payload.compatible_kits as string[]));
        const insertData = uniqueKitIds.map((kitId: string) => ({
          kit_id: kitId,
          product_id: data.id,
          quantity: 1,
        }));
        await supabase.from('kit_items').insert(insertData);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['kit_items'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkInsertProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (products: any[]) => {
      // Using upsert to handle existing SKUs gracefully
      const { data, error } = await supabase
        .from('products')
        .upsert(products, { onConflict: 'code' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { code: string; name: string; stock: number }[]) => {
      const { data, error } = await supabase
        .from('products')
        .upsert(updates, { onConflict: 'code' })
        .select('id, code, stock');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ========== Categories ==========
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('section', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Partial<Category> & { id: string }) => {
      const { id, created_at, ...updateData } = category as any;
      const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Products might need updated category names
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Refetch products to show unassigned categories
    },
  });
}

// ========== Settings (BCV Rate) ==========
export function useBcvRate() {
  return useQuery<number>({
    queryKey: ['bcv_rate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'bcv_rate')
        .single();
      if (error) throw error;
      return Number(data.value);
    },
  });
}

export function useUpdateBcvRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newRate: number) => {
      const { error } = await supabase
        .from('settings')
        .update({ value: newRate, updated_at: new Date().toISOString() })
        .eq('key', 'bcv_rate');
      if (error) throw error;
      return newRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcv_rate'] });
    },
  });
}

export function useMarginPercentage() {
  return useQuery<number>({
    queryKey: ['margin_percentage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'margin_percentage')
        .single();
      // If error (not found), return default 40
      if (error) return 40;
      return Number(data.value);
    },
  });
}

export function useUpdateMarginPercentage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newMargin: number) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'margin_percentage', value: newMargin, updated_at: new Date().toISOString() });
      if (error) throw error;
      return newMargin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin_percentage'] });
    },
  });
}

export function useBcvMultiplier() {
  return useQuery<number>({
    queryKey: ['bcv_multiplier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'bcv_multiplier')
        .single();
      if (error) return 1.40;
      return Number(data.value);
    },
  });
}

export function useUpdateBcvMultiplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newMultiplier: number) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'bcv_multiplier', value: newMultiplier, updated_at: new Date().toISOString() });
      if (error) throw error;
      return newMultiplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcv_multiplier'] });
    },
  });
}

// ========== Quotes ==========
export function useQuotes() {
  return useQuery<Quote[]>({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quote,
      items,
    }: {
      quote: Omit<Quote, 'id' | 'created_at'>;
      items: Omit<QuoteItem, 'id' | 'quote_id'>[];
    }) => {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      if (quoteError) throw quoteError;

      const quoteItems = items.map((item) => ({
        ...item,
        quote_id: quoteData.id,
      }));
      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems);
      if (itemsError) throw itemsError;

      return quoteData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

// ========== Image Upload ==========
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, productCode }: { file: File; productCode: string }) => {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const sanitizedCode = (productCode || 'PROD').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${sanitizedCode}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
  });
}

export function useUploadKitImage() {
  return useMutation({
    mutationFn: async ({ file, kitId }: { file: File; kitId: string }) => {
      const fileExt = file.name.split('.').pop() || 'jpg';
      // Use a random string if kitId is not available yet (creating new kit)
      const prefix = (kitId || Math.random().toString(36).substring(7)).replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `kit-${prefix}-${Date.now()}.${fileExt}`;
      const filePath = `kits/${fileName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
  });
}

// ========== Kits ==========
export function useKits(category?: string) {
  return useQuery<any[]>({
    queryKey: ['kits', category],
    queryFn: async () => {
      let query = supabase.from('kits').select('*, kit_items(*), vehicle_brands(*)').order('name', { ascending: true });
      if (category) {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kit: any) => {
      const { data, error } = await supabase.from('kits').insert(kit).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kit: any) => {
      const { id, ...updateData } = kit;
      const { data, error } = await supabase.from('kits').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });
}

export function useDeleteKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kits').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });
}

export function useKitItems(kitId: string) {
  return useQuery<any[]>({
    queryKey: ['kit_items', kitId],
    queryFn: async () => {
      if (!kitId) return [];
      const { data, error } = await supabase
        .from('kit_items')
        .select('*, products(*, categories(*), brands(*), kit_items(kit_id))')
        .eq('kit_id', kitId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!kitId,
  });
}

export function useCreateKitItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kitItem: any) => {
      // 1. Verificar en base de datos si el repuesto ya está en este cotizador
      if (kitItem.kit_id && kitItem.product_id) {
        const { data: existing, error: checkError } = await supabase
          .from('kit_items')
          .select('id')
          .eq('kit_id', kitItem.kit_id)
          .eq('product_id', kitItem.product_id)
          .maybeSingle();

        if (existing) {
          throw new Error('Este repuesto ya se encuentra vinculado en este cotizador.');
        }
      }

      const { data, error } = await supabase.from('kit_items').insert(kitItem).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['kit_items', variables.kit_id] });
    },
  });
}

export function useDeleteKitItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kitId }: { id: string; kitId: string }) => {
      const { error } = await supabase.from('kit_items').delete().eq('id', id);
      if (error) throw error;
      return { id, kitId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['kit_items', variables.kitId] });
    },
  });
}

// ========== Kit Combos ==========
export function useKitCombos(kitId: string) {
  return useQuery<any[]>({
    queryKey: ['kit_combos', kitId],
    queryFn: async () => {
      if (!kitId) return [];
      const { data, error } = await supabase
        .from('kit_combos')
        .select('*, kit_combo_items(*, products(*, brands(*), categories(*)))')
        .eq('kit_id', kitId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!kitId,
  });
}

export function useCreateKitCombo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (combo: { kit_id: string; name: string }) => {
      const { data, error } = await supabase.from('kit_combos').insert(combo).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kit_combos', variables.kit_id] });
    },
  });
}

export function useUpdateKitCombo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, kitId }: { id: string; name: string; kitId: string }) => {
      const { data, error } = await supabase.from('kit_combos').update({ name }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kit_combos', variables.kitId] });
    },
  });
}

export function useDeleteKitCombo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kitId }: { id: string; kitId: string }) => {
      const { error } = await supabase.from('kit_combos').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kit_combos', variables.kitId] });
    },
  });
}

export function useSaveComboItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ comboId, items }: { comboId: string; items: { product_id: string; quantity: number }[] }) => {
      // First, delete all existing items for this combo
      const { error: deleteError } = await supabase.from('kit_combo_items').delete().eq('combo_id', comboId);
      if (deleteError) throw deleteError;

      // Then insert the new ones if any
      if (items.length > 0) {
        const rows = items.map(item => ({
          combo_id: comboId,
          product_id: item.product_id,
          quantity: item.quantity,
        }));
        const { error: insertError } = await supabase.from('kit_combo_items').insert(rows);
        if (insertError) throw insertError;
      }
      return comboId;
    },
    onSuccess: (_, variables) => {
      // Invalidate the kit_combos query so it refetches the items
      queryClient.invalidateQueries({ queryKey: ['kit_combos'] });
    },
  });
}

export function useDeleteKitComboItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('kit_combo_items').delete().eq('id', itemId);
      if (error) throw error;
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit_combos'] });
    },
  });
}

export function useUpdateKitComboItemQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase.from('kit_combo_items').update({ quantity }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit_combos'] });
    },
  });
}
// ========== Brands ==========
export function useBrands() {
  return useQuery<any[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brands').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: any) => {
      const { data, error } = await supabase.from('brands').insert(brand).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: any) => {
      const { id, ...updateData } = brand;
      const { data, error } = await supabase.from('brands').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ========== Vehicle Brands ==========
export function useVehicleBrands() {
  return useQuery<any[]>({
    queryKey: ['vehicle_brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_brands').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateVehicleBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: any) => {
      const { data, error } = await supabase.from('vehicle_brands').insert(brand).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_brands'] });
    },
  });
}

export function useUpdateVehicleBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brand: any) => {
      const { id, ...updateData } = brand;
      const { data, error } = await supabase.from('vehicle_brands').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_brands'] });
    },
  });
}

export function useDeleteVehicleBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_brands').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_brands'] });
    },
  });
}

// ========== Price History ==========
export function usePriceHistory(productId: string) {
  return useQuery<any[]>({
    queryKey: ['price_history', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_price_history')
        .select('*')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}
