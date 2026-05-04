'use client';

import { useActionState } from 'react';
import { setNewPassword } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(setNewPassword, emptyFormState);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <FormStatus state={state} />
      <div>
        <label className="label" htmlFor="rp-pw">New password</label>
        <input
          id="rp-pw"
          className="input"
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
        <label className="label" htmlFor="rp-confirm">Confirm password</label>
        <input
          id="rp-confirm"
          className="input"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
