'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fieldOptionalNumber, fieldString, formatPgError, type FormState } from '@/lib/forms';

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to update your profile.' };

  const display_name = fieldString(formData, 'display_name');
  const full_name = fieldString(formData, 'full_name');
  const gender = fieldString(formData, 'gender');
  const dupr_id = fieldString(formData, 'dupr_id');
  const dupr_singles = fieldOptionalNumber(formData, 'dupr_singles');
  const dupr_doubles = fieldOptionalNumber(formData, 'dupr_doubles');
  const bio = fieldString(formData, 'bio');

  if (!display_name) return { error: 'Display name is required.' };

  const { error } = await supabase.rpc('app_save_profile', {
    p_display_name: display_name,
    p_full_name: full_name || null,
    p_gender: gender || null,
    p_dupr_id: dupr_id || null,
    p_dupr_singles: dupr_singles,
    p_dupr_doubles: dupr_doubles,
    p_bio: bio || null,
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath('/profile');
  return { ok: 'Profile saved.' };
}

export async function setAvatarUrl(url: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  revalidatePath('/profile');
}
