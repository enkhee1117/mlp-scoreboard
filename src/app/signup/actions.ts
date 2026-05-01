'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fieldString, type FormState } from '@/lib/forms';
import { validateEmail, validatePassword } from '@/lib/validation';

function safeNext(raw: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export async function signUpWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = fieldString(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const display_name = fieldString(formData, 'display_name');
  const next = safeNext(fieldString(formData, 'next') || '/');

  if (!display_name || display_name.length < 1) {
    return { error: 'Display name is required.' };
  }
  for (const c of [validateEmail(email), validatePassword(password)]) {
    if (!c.ok) return { error: c.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name } },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    redirect(`/login?ok=${encodeURIComponent('Account created. Check your email to confirm, then sign in.')}`);
  }

  redirect(next);
}
