import { supabase } from './supabaseClient';
import type { ListMember } from '../types';

const ACCESS_CODE_LENGTH = 6;

function generateAccessCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < ACCESS_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }
  return result;
}

function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export interface ListRecord {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  access_code: string;
}

export interface ListSummary extends ListRecord {
  role: 'owner' | 'editor' | 'viewer';
  owner?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
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
    access_code: string;
    profiles?: {
      id: string;
      name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

type RawMemberRow = {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  profile?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchUserLists(userId: string): Promise<ListSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('list_members')
    .select(`
      list_id,
      role,
      created_at,
      lists:lists!inner (
        id,
        name,
        owner_id,
        created_at,
        access_code,
        owner:profiles!lists_owner_id_fkey (
          id,
          name,
          avatar_url,
          short_name
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user lists', error);
    return [];
  }

  return (data as RawMembershipRow[] | null)?.map((row) => {
    const list = row.lists as (RawMembershipRow['lists'] & {
      owner?: {
        id: string;
        name: string | null;
        avatar_url: string | null;
        short_name: string | null;
      } | null;
    }) | null;
    if (list) {
      const ownerProfile = list.owner || null;
      return {
        id: list.id,
        name: list.name,
        owner_id: list.owner_id,
        created_at: list.created_at,
        access_code: list.access_code,
        role: row.role,
        owner: ownerProfile
          ? {
              id: ownerProfile.id,
              name: ownerProfile.short_name || ownerProfile.name || 'Владелец',
              avatar_url: ownerProfile.avatar_url,
            }
          : null,
      } satisfies ListSummary;
    }
    return {
      id: row.list_id,
      name: 'Shared list',
      owner_id: userId,
      created_at: row.created_at || new Date(0).toISOString(),
      access_code: '------',
      role: row.role,
    } satisfies ListSummary;
  }) ?? [];
}

export async function createListForUser(userId: string, name = 'My list'): Promise<ListSummary | null> {
  if (!supabase) return null;
  const accessCode = generateAccessCode();
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, owner_id: userId, access_code: accessCode })
    .select('id, name, owner_id, created_at, access_code')
    .single();

  if (error) {
    console.error('Failed to create list', error);
    return null;
  }

  const list = data as { id: string; name: string; owner_id: string; access_code: string; created_at: string };
  await supabase
    .from('list_members')
    .upsert({ list_id: list.id, user_id: userId, role: 'owner' }, { onConflict: 'list_id,user_id' });

  return { ...list, role: 'owner', owner: { id: userId, name: null, avatar_url: null } } satisfies ListSummary;
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
    .select(`
      user_id,
      role,
      profile:profiles!list_members_user_id_fkey (
        id,
        name,
        avatar_url,
        short_name
      )
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch list members', error);
    return [];
  }

  const members = (data as RawMemberRow[] | null)?.map((row) => {
    const profile = (row as any).profile as {
      id: string;
      name: string | null;
      avatar_url: string | null;
      short_name: string | null;
    } | null;
    const memberName = profile?.short_name || profile?.name || 'Member';
    console.log('Member profile loaded:', { 
      user_id: row.user_id, 
      name: profile?.name, 
      short_name: profile?.short_name,
      result_name: memberName 
    });
    return {
      id: row.user_id,
      role: row.role,
      name: memberName,
      avatar: profile?.avatar_url ?? undefined,
      email: null,
    } satisfies ListMember;
  }) ?? [];
  
  return members;
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

export async function refreshAccessCode(listId: string, userId: string): Promise<string | null> {
  if (!supabase) return null;
  const nextCode = generateAccessCode();
  const { data, error } = await supabase
    .from('lists')
    .update({ access_code: nextCode })
    .eq('id', listId)
    .eq('owner_id', userId)
    .select('access_code')
    .single();

  if (error) {
    console.error('Failed to refresh access code', error);
    return null;
  }

  return (data as { access_code: string }).access_code;
}

export async function joinListByAccessCode(code: string, userId: string): Promise<ListSummary | null> {
  if (!supabase) return null;
  const normalized = normalizeAccessCode(code);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc('join_list_by_code', { p_access_code: normalized });

  if (error) {
    console.error('Failed to join list by code', error);
    return null;
  }

  if (!data) return null;

  const list = data as ListRecord;

  return {
    id: list.id,
    name: list.name,
    owner_id: list.owner_id,
    created_at: list.created_at,
    access_code: list.access_code,
    role: list.owner_id === userId ? 'owner' : 'editor',
    owner: null,
  } satisfies ListSummary;
}

export async function leaveList(listId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  
  // Нельзя выйти из списка, если ты владелец (нужно сначала передать права)
  const { data: list } = await supabase
    .from('lists')
    .select('owner_id')
    .eq('id', listId)
    .single();
  
  if (list?.owner_id === userId) {
    console.error('Cannot leave list you own');
    return false;
  }

  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to leave list', error);
    return false;
  }

  return true;
}
