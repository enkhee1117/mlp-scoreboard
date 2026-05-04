import Link from 'next/link';
import { LoginForm } from './_components/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? '/';
  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-text-muted">
        Welcome back. Enter your email and password to continue.
      </p>

      {sp.ok && (
        <div
          role="status"
          className="mt-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-emerald-300"
        >
          {sp.ok}
        </div>
      )}

      <LoginForm next={next} />

      <div className="mt-3 text-right">
        <Link href="/forgot-password" className="text-xs font-semibold text-text-muted hover:text-volt">
          Forgot password?
        </Link>
      </div>

      <p className="mt-4 text-xs text-text-muted">
        New to TourneyPal?{' '}
        <Link
          href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-volt hover:text-volt-hover"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
