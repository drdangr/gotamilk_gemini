import { supabase } from './supabaseClient';

export interface ListInvite {
  id: string;
  list_id: string;
  token: string;
  role: 'editor' | 'viewer';
  created_at: string;
  expires_at?: string | null;
}

const INVITE_EXPIRATION_HOURS = 24 * 7; // 7 дней по умолчанию

function isInviteExpired(invite: ListInvite): boolean {
  if (!invite.expires_at) return false;
  const expiresAt = new Date(invite.expires_at).getTime();
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

export async function getOrCreateActiveInvite(
  listId: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<ListInvite | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('list_invites')
    .select('id, list_id, token, role, created_at, expires_at')
    .eq('list_id', listId)
    .eq('role', role)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Не удалось получить инвайт списка', error);
  }

  const existing = (data as ListInvite[] | null)?.[0];
  if (existing && !isInviteExpired(existing)) {
    return existing;
  }

  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from('list_invites')
    .insert({ list_id: listId, token, role, expires_at: expiresAt })
    .select('id, list_id, token, role, created_at, expires_at')
    .single();

  if (insertError) {
    console.error('Не удалось создать инвайт', insertError);
    return null;
  }

  return inserted as ListInvite;
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<{ listId: string; role: 'editor' | 'viewer' } | null> {
  if (!supabase) return null;

  const { data: invite, error } = await supabase
    .from('list_invites')
    .select('id, list_id, token, role, expires_at')
    .eq('token', token)
    .single();

  if (error) {
    console.error('Не удалось найти инвайт', error);
    return null;
  }

  if (!invite) {
    console.warn('Инвайт не найден');
    return null;
  }

  const listInvite = invite as ListInvite;
  if (isInviteExpired(listInvite)) {
    console.warn('Инвайт истёк');
    return null;
  }

  const role = listInvite.role ?? 'editor';

  const { error: upsertError } = await supabase
    .from('list_members')
    .upsert({ list_id: listInvite.list_id, user_id: userId, role }, { onConflict: 'list_id,user_id' });

  if (upsertError) {
    console.error('Не удалось добавить участника по инвайту', upsertError);
    return null;
  }

  return { listId: listInvite.list_id, role };
}

