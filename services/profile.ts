import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export async function ensureProfile(user: User): Promise<void> {
  if (!supabase) return;
  const name = (user.user_metadata as any)?.name || user.email || 'User';
  const avatar_url = (user.user_metadata as any)?.avatar_url || null;
  await supabase.from('profiles').upsert(
    { id: user.id, name, avatar_url },
    { onConflict: 'id' }
  );
}

export async function updateProfileShortName(userId: string, shortName: string | null): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('profiles')
    .update({ short_name: shortName })
    .eq('id', userId);
  
  return !error;
}


