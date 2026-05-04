'use server';

import { createClient } from '@/lib/supabase/server';
import { fieldString, type FormState } from '@/lib/forms';
import { validateEmail } from '@/lib/validation';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function sendPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = fieldString(formData, 'email').toLowerCase();
  const c = validateEmail(email);
  if (!c.ok) return { error: c.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error) console.error('resetPasswordForEmail failed', error);

  // Always show the same message, regardless of whether the address exists.
  return { ok: 'If an account exists for that email, a reset link is on its way.' };
}
