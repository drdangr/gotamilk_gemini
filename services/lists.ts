import { supabase } from './supabaseClient';

export interface ListRecord {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export async function getOrCreateDefaultList(userId: string): Promise<ListRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) {
    console.error('Failed to fetch lists', error);
  }
  if (data && data.length > 0) {
    return data[0] as ListRecord;
  }

  // Create new list
  const { data: inserted, error: insertErr } = await supabase
    .from('lists')
    .insert({ name: 'My list', owner_id: userId })
    .select('*')
    .single();
  if (insertErr) {
    console.error('Failed to create default list', insertErr);
    return null;
  }
  const list = inserted as ListRecord;
  // add owner as member
  await supabase.from('list_members').upsert({ list_id: list.id, user_id: userId, role: 'owner' });
  return list;
}


