'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function sendPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });

  // Don't leak whether the email exists; always show the same confirmation.
  if (error) {
    console.error('resetPasswordForEmail failed', error);
  }
  redirect('/forgot-password?sent=1');
}
