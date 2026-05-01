import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setNewPassword } from './actions';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/forgot-password?error=Reset%20link%20expired');
  }

  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <p className="mt-1 text-sm text-text-muted">
        Choose a new password for{' '}
        <span className="font-mono text-slate-200">{user.email}</span>.
      </p>

      {sp.error && (
        <div className="mt-4 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-red-300">
          {sp.error}
        </div>
      )}

      <form action={setNewPassword} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-text-muted">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input
            className="input"
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary w-full" type="submit">Update password</button>
      </form>
    </div>
  );
}
