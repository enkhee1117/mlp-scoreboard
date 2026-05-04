'use client';

import { useActionState } from 'react';
import { sendPasswordReset } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(sendPasswordReset, emptyFormState);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <FormStatus state={state} />
      <div>
        <label className="label" htmlFor="fp-email">Email</label>
        <input
          id="fp-email"
          className="input"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          inputMode="email"
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Sending...">
        Send reset link
      </SubmitButton>
    </form>
  );
}
