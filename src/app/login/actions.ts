'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fieldString, type FormState } from '@/lib/forms';
import { validateEmail, validatePassword } from '@/lib/validation';

function safeNext(raw: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = fieldString(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(fieldString(formData, 'next') || '/');

  for (const c of [validateEmail(email), validatePassword(password)]) {
    if (!c.ok) return { error: c.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      return { error: 'Email and password did not match.' };
    }
    return { error: error.message };
  }

  redirect(next);
}
