'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fieldString, type FormState } from '@/lib/forms';
import { validateEmail, validatePassword } from '@/lib/validation';
import { safeNext } from '@/lib/auth-redirect';
import { normalizeE164 } from '@/lib/phone';

// The form has a single "phone or email" field. We auto-detect which one it
// is — anything containing '@' goes through email auth, anything that
// normalizes to E.164 goes through phone auth. New signups are phone-only,
// but existing email accounts keep working until users transition.
export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = fieldString(formData, 'identifier').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(fieldString(formData, 'next') || '/');

  if (!identifier) return { error: 'Phone or email is required.' };
  const passCheck = validatePassword(password);
  if (!passCheck.ok) return { error: passCheck.error };

  const supabase = await createClient();

  let signInError: { message: string } | null = null;
  let authedUserId: string | undefined;

  if (identifier.includes('@')) {
    const email = identifier.toLowerCase();
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) return { error: emailCheck.error };
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    signInError = error;
    authedUserId = authData?.user?.id;
  } else {
    const phone = normalizeE164(identifier);
    if (!phone) {
      return { error: 'Enter a phone in E.164 format (e.g. +15551234567) or an email.' };
    }
    const { data: authData, error } = await supabase.auth.signInWithPassword({ phone, password });
    signInError = error;
    authedUserId = authData?.user?.id;
  }

  if (signInError) {
    if (signInError.message.toLowerCase().includes('invalid')) {
      return { error: 'Phone/email and password did not match.' };
    }
    return { error: signInError.message };
  }

  if (next === '/' && authedUserId) {
    const { data: member } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .eq('user_id', authedUserId)
      .in('role', ['owner', 'organizer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (member) redirect(`/tournaments/${member.tournament_id}`);
    redirect('/tournaments');
  }

  redirect(next);
}
