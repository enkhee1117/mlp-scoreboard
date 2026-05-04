import Link from 'next/link';
import { SignupForm } from './_components/SignupForm';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? '/';
  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-text-muted">
        Join TourneyPal to run tournaments, manage players, and track match history.
      </p>

      <SignupForm next={next} />

      <p className="mt-4 text-xs text-text-muted">
        Already have an account?{' '}
        <Link
          href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-volt hover:text-volt-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
