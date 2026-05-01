'use client';

import { useActionState } from 'react';
import { generateRoundRobinMatches } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function GenerateMatchesForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction] = useActionState(generateRoundRobinMatches, emptyFormState);
  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div>
        <label className="label" htmlFor="gm-courts">Courts</label>
        <input
          id="gm-courts"
          className="input w-24 !py-1"
          name="court_count"
          type="number"
          min={1}
          max={16}
          defaultValue={4}
          inputMode="numeric"
        />
      </div>
      <SubmitButton className="btn btn-ghost" pendingLabel="Generating...">
        Generate round robin
      </SubmitButton>
      <FormStatus state={state} className="grow" />
    </form>
  );
}
