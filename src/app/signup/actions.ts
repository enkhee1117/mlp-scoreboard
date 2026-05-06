'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fieldString, type FormState } from '@/lib/forms';
import { validatePassword } from '@/lib/validation';
import { safeNext } from '@/lib/auth-redirect';
import { normalizeE164 } from '@/lib/phone';

export async function signUpWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const phoneRaw = fieldString(formData, 'phone');
  const phone = normalizeE164(phoneRaw);
  const password = String(formData.get('password') ?? '');
  const display_name = fieldString(formData, 'display_name');
  const next = safeNext(fieldString(formData, 'next') || '/');

  if (!display_name || display_name.length < 1) {
    return { error: 'Display name is required.' };
  }
  if (!phone) {
    return { error: 'Phone must be in E.164 format (e.g. +15551234567).' };
  }
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { error: passCheck.error };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
    options: { data: { display_name } },
  });
  if (error) return { error: error.message };

  // Supabase returns a fake-success response when the phone is already
  // registered (anti-enumeration). identities.length === 0 is the tell.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      error: 'An account with this phone already exists. Try signing in instead.',
    };
  }

  // Dev-mode convenience: skip the SMS verification round-trip. Auto-confirm
  // the new user via the service-role admin client, then sign them in so the
  // session cookie is set and the redirect lands them logged in.
  if (data.user && !data.session) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, { phone_confirm: true });
      const { error: signInErr } = await supabase.auth.signInWithPassword({ phone, password });
      if (signInErr) {
        return { ok: 'Account created. Sign in below.', error: undefined };
      }
    } catch (e) {
      console.error('auto-confirm failed', e);
      return {
        ok: 'Account created. If sign-in fails, verify your phone first.',
      };
    }
  }

  redirect(next);
}
