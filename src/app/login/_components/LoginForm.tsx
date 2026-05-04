'use client';

import { useActionState } from 'react';
import { signInWithPassword } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInWithPassword, emptyFormState);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <FormStatus state={state} />
      <div>
        <label className="label" htmlFor="li-email">Email</label>
        <input
          id="li-email"
          className="input"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          inputMode="email"
        />
      </div>
      <div>
        <label className="label" htmlFor="li-pw">Password</label>
        <input
          id="li-pw"
          className="input"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
