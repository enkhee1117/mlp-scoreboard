'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addTournamentPlayer } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function AddPlayerForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction] = useActionState(addTournamentPlayer, emptyFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <FormStatus state={state} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="input"
          name="display_name"
          placeholder="Player name"
          required
          minLength={2}
          maxLength={120}
        />
        <input
          className="input"
          name="email"
          type="email"
          placeholder="Email (optional)"
          inputMode="email"
          autoComplete="off"
        />
        <SubmitButton className="btn btn-primary" pendingLabel="Adding...">Add</SubmitButton>
      </div>
      <p className="text-xs text-text-muted">
        Adding an email links this player to a TourneyPal account so their match history shows up in their profile.
      </p>
    </form>
  );
}
