'use client';

import { useActionState } from 'react';
import { signUpWithPassword } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function SignupForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signUpWithPassword, emptyFormState);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <FormStatus state={state} />
      <div>
        <label className="label" htmlFor="su-name">Display name</label>
        <input id="su-name" className="input" name="display_name" required autoFocus maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="su-email">Email</label>
        <input
          id="su-email"
          className="input"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
        />
      </div>
      <div>
        <label className="label" htmlFor="su-pw">Password</label>
        <input
          id="su-pw"
          className="input"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-text-muted">At least 8 characters.</p>
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Creating account...">
        Create account
      </SubmitButton>
    </form>
  );
}
