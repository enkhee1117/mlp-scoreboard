'use client';

import { useActionState } from 'react';
import { createTournament } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

export function CreateTournamentForm() {
  const [state, formAction] = useActionState(createTournament, emptyFormState);
  return (
    <form action={formAction} className="mt-4 space-y-4">
      <FormStatus state={state} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="label" htmlFor="ct-name">Tournament name</label>
          <input
            id="ct-name"
            className="input"
            name="name"
            placeholder="e.g. Spring Open 2026"
            required
            minLength={3}
            maxLength={120}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="ct-format">Format</label>
          <select id="ct-format" className="input" name="format" defaultValue="round_robin">
            <option value="round_robin">Round robin</option>
            <option value="fixed_partners">Fixed partners</option>
            <option value="bracket">Bracket</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ct-count">Number of players</label>
          <input
            id="ct-count"
            className="input"
            name="player_count"
            type="number"
            min={0}
            max={64}
            defaultValue={8}
            inputMode="numeric"
          />
          <p className="mt-1 text-xs text-text-muted">
            Pre-fills Player 1 ... Player N. Rename them on the tournament page.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="ct-whatsapp">WhatsApp group URL (optional)</label>
          <input
            id="ct-whatsapp"
            className="input"
            name="whatsapp_group_url"
            placeholder="https://chat.whatsapp.com/..."
            inputMode="url"
            autoComplete="off"
          />
        </div>
      </div>
      <SubmitButton className="btn btn-primary w-full" pendingLabel="Creating tournament...">
        Create
      </SubmitButton>
    </form>
  );
}
