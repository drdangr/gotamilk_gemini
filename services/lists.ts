import { supabase } from './supabaseClient';
import type { ListMember } from '../types';

export interface ListRecord {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface ListSummary extends ListRecord {
  role: 'owner' | 'editor' | 'viewer';
}

type RawMembershipRow = {
  list_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at?: string;
  lists?: {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
  } | null;
};

type RawMemberRow = {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  profiles?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchUserLists(userId: string): Promise<ListSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('list_members')
    .select('list_id, role, created_at, lists!inner(id, name, owner_id, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user lists', error);
    return [];
  }

  return (data as RawMembershipRow[] | null)?.map((row) => {
    const list = row.lists;
    if (list) {
      return {
        id: list.id,
        name: list.name,
        owner_id: list.owner_id,
        created_at: list.created_at,
        role: row.role,
      } satisfies ListSummary;
    }
    return {
      id: row.list_id,
      name: 'Shared list',
      owner_id: userId,
      created_at: row.created_at || new Date(0).toISOString(),
      role: row.role,
    } satisfies ListSummary;
  }) ?? [];
}

export async function createListForUser(userId: string, name = 'My list'): Promise<ListSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, owner_id: userId })
    .select('id, name, owner_id, created_at')
    .single();

  if (error) {
    console.error('Failed to create list', error);
    return null;
  }

  const list = data as ListRecord;
  await supabase
    .from('list_members')
    .upsert({ list_id: list.id, user_id: userId, role: 'owner' }, { onConflict: 'list_id,user_id' });

  return { ...list, role: 'owner' } satisfies ListSummary;
}

export async function getOrCreateDefaultList(userId: string): Promise<ListSummary | null> {
  const lists = await fetchUserLists(userId);
  if (lists.length > 0) {
    return lists[0];
  }
  return await createListForUser(userId);
}

export async function fetchListMembers(listId: string): Promise<ListMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('list_members')
    .select('user_id, role, profiles!inner(id, name, avatar_url)')
    .eq('list_id', listId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch list members', error);
    return [];
  }

  return (data as RawMemberRow[] | null)?.map((row) => {
    const profile = row.profiles;
    return {
      id: row.user_id,
      role: row.role,
      name: profile?.name ?? 'Member',
      avatar: profile?.avatar_url ?? undefined,
      email: null,
    } satisfies ListMember;
  }) ?? [];
}

export function subscribeToListMembers(
  listId: string,
  handlers: { onChange?: () => void | Promise<void> }
): () => void {
  if (!supabase) return () => {};
  const channel = supabase.channel(`list_members:${listId}`);
  const callback = async () => {
    try {
      await handlers.onChange?.();
    } catch (error) {
      console.error('Failed to process list_members realtime event', error);
    }
  };

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'list_members', filter: `list_id=eq.${listId}` },
      callback
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.error('Failed to remove list_members channel', error);
    }
  };
}
