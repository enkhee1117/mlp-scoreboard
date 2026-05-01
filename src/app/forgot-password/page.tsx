import Link from 'next/link';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { sendPasswordReset } from './actions';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Forgot password</h1>
      <p className="mt-1 text-sm text-text-muted">
        Enter the email on your TourneyPal account and we&rsquo;ll send a link to reset your
        password.
      </p>

      {sp.sent && (
        <div className="mt-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-emerald-300">
          If an account exists for that email, a reset link is on its way.
        </div>
      )}
      {sp.error && (
        <div className="mt-4 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-red-300">
          {sp.error}
        </div>
      )}

      <form action={sendPasswordReset} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoFocus autoComplete="email" />
        </div>
        <SubmitButton className="btn btn-primary w-full" pendingLabel="Sending...">Send reset link</SubmitButton>
      </form>

      <p className="mt-4 text-xs text-text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-volt hover:text-volt-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
