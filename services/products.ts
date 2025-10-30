import { supabase } from './supabaseClient';
import type { Product, Alias } from '../types';

export async function fetchAllProducts(): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch products', error);
    return [];
  }
  
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    aliasId: row.alias_id || '',
    category: row.category || undefined,
  }));
}

export async function fetchAllAliases(): Promise<Alias[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('aliases')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch aliases', error);
    return [];
  }
  
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        alias_id: product.aliasId,
        category: product.category || null,
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to create product', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      aliasId: data.alias_id || '',
      category: data.category || undefined,
    };
  } catch (error) {
    console.error('Error creating product', error);
    return null;
  }
}

export async function createAlias(alias: Omit<Alias, 'id'>): Promise<Alias | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('aliases')
      .insert({ name: alias.name })
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to create alias', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
    };
  }
  
  export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (!supabase) return null;
    
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.aliasId !== undefined) payload.alias_id = updates.aliasId || null;
    if (updates.category !== undefined) payload.category = updates.category || null;
    
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to update product', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      aliasId: data.alias_id || '',
      category: data.category || undefined,
    };
  }
  
  export async function deleteProduct(id: string): Promise<boolean> {
    if (!supabase) return false;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Failed to delete product', error);
      return false;
    }
    
    return true;
  }
