import { supabase } from './supabaseClient';
import type { ListItem, Priority } from '../types';

export async function fetchListItems(listId: string): Promise<ListItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to fetch list_items', error);
    return [];
  }
  return (data || []).map(row => mapRowToListItem(row));
}

export async function insertListItem(listId: string, partial: Omit<ListItem, 'id'>): Promise<ListItem | null> {
  if (!supabase) return null;
  const payload = {
    list_id: listId,
    name: partial.name,
    quantity: partial.quantity,
    unit: partial.unit,
    priority: partial.priority,
    status: partial.status,
    assignee_user_id: partial.assignee?.id || partial.assigneeId || null,
  };
  const { data, error } = await supabase
    .from('list_items')
    .insert(payload)
    .select('*')
    .single();
  if (error) {
    console.error('Failed to insert list_item', error);
    return null;
  }
  return mapRowToListItem(data);
}

export async function updateListItem(listId: string, id: string, patch: Partial<ListItem>): Promise<ListItem | null> {
  if (!supabase) return null;
  const payload: any = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.quantity !== undefined) payload.quantity = patch.quantity;
  if (patch.unit !== undefined) payload.unit = patch.unit;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.assigneeId !== undefined) {
    payload.assignee_user_id = patch.assigneeId || null;
  } else if (patch.assignee !== undefined) {
    payload.assignee_user_id = patch.assignee?.id || null;
  }

  const { data, error } = await supabase
    .from('list_items')
    .update(payload)
    .eq('id', id)
    .eq('list_id', listId)
    .select('*')
    .single();
  if (error) {
    console.error('Failed to update list_item', error);
    return null;
  }
  return mapRowToListItem(data);
}

export async function deleteListItem(listId: string, id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', id)
    .eq('list_id', listId);
  if (error) {
    console.error('Failed to delete list_item', error);
    return false;
  }
  return true;
}

export function mapRowToListItem(row: any): ListItem {
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity ?? 1),
    unit: row.unit || 'pcs',
    priority: Number(row.priority ?? 0) as Priority,
    status: row.status,
    assigneeId: row.assignee_user_id ?? undefined,
    assignee: row.assignee_user_id ? { id: row.assignee_user_id } : undefined,
  };
}

export function subscribeToListItems(
  listId: string,
  handlers: {
    onInsert?: (item: ListItem) => void;
    onUpdate?: (item: ListItem) => void;
    onDelete?: (id: string) => void;
  }
): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel(`list_items:${listId}`);

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
      (payload) => {
        if (handlers.onInsert) handlers.onInsert(mapRowToListItem(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
      (payload) => {
        if (handlers.onUpdate) handlers.onUpdate(mapRowToListItem(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
      (payload) => {
        if (handlers.onDelete) handlers.onDelete(payload.old.id);
      }
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}


