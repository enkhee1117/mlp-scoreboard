import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from './_components/ResetPasswordForm';

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/forgot-password');
  }

  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <p className="mt-1 text-sm text-text-muted">
        Choose a new password for{' '}
        <span className="font-mono text-slate-200">{user.email}</span>.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
