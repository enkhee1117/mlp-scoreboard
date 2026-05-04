'use client';

import { useActionState } from 'react';
import { generatePlayoffs } from '@/app/tournaments/actions';
import { emptyFormState } from '@/lib/forms';

export function GeneratePlayoffsForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, pending] = useActionState(generatePlayoffs, emptyFormState);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="division_id" value="open" />
      <input type="hidden" name="court_a" value="Court 1" />
      <input type="hidden" name="court_b" value="Court 2" />

      {state.error && (
        <div
          className="rounded-2xl border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--berry)', color: 'var(--berry)', background: 'oklch(0.96 0.04 12)' }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl px-5 py-[18px] text-base font-semibold tracking-tight transition active:scale-[0.97] disabled:opacity-70"
        style={{
          background: 'var(--court)',
          color: 'oklch(0.2 0.04 140)',
          boxShadow: '0 4px 14px oklch(0.2 0.05 100 / 0.12)',
        }}
      >
        {pending ? 'Seeding…' : 'Seed playoffs →'}
      </button>
      <div className="mt-1 text-center text-[11px] text-ink-3">
        Top 4 seeds advance. 1 vs 4 and 2 vs 3 in the semis. Winners play for
        gold, losers play for bronze.
      </div>
    </form>
  );
}
