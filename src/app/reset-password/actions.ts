'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { type FormState } from '@/lib/forms';
import { validatePassword } from '@/lib/validation';

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const c = validatePassword(password);
  if (!c.ok) return { error: c.error };
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/login?ok=Password%20updated.%20Sign%20in%20with%20your%20new%20password.');
}
