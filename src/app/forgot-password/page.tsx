import Link from 'next/link';
import { ForgotPasswordForm } from './_components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="card mx-auto mt-12 max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">Forgot password</h1>
      <p className="mt-1 text-sm text-text-muted">
        Enter the email on your TourneyPal account and we&rsquo;ll send a link to reset your password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-4 text-xs text-text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-volt hover:text-volt-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
