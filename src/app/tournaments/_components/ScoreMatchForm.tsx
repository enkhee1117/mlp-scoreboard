'use client';

import { useActionState } from 'react';
import { scoreMatch } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

type Props = {
  tournamentId: string;
  matchId: string;
  defaultA: number | null;
  defaultB: number | null;
};

export function ScoreMatchForm({ tournamentId, matchId, defaultA, defaultB }: Props) {
  const [state, formAction] = useActionState(scoreMatch, emptyFormState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="match_id" value={matchId} />
      <div className="flex items-end gap-2">
        <div className="w-20">
          <label className="label">A</label>
          <input
            className="input !py-1 text-center font-display text-lg tabular-nums"
            name="team_a_score"
            type="number"
            min={0}
            max={999}
            inputMode="numeric"
            defaultValue={defaultA ?? ''}
          />
        </div>
        <div className="w-20">
          <label className="label">B</label>
          <input
            className="input !py-1 text-center font-display text-lg tabular-nums"
            name="team_b_score"
            type="number"
            min={0}
            max={999}
            inputMode="numeric"
            defaultValue={defaultB ?? ''}
          />
        </div>
        <SubmitButton className="btn btn-ghost !py-1 !px-2 text-xs" pendingLabel="...">
          Save
        </SubmitButton>
      </div>
      <FormStatus state={state} />
    </form>
  );
}
