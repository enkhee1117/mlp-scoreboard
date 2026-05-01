'use client';

import { useActionState } from 'react';
import { updateTournament } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

type Props = {
  tournamentId: string;
  defaultName: string;
  defaultWhatsAppUrl: string | null;
};

export function UpdateTournamentForm({ tournamentId, defaultName, defaultWhatsAppUrl }: Props) {
  const [state, formAction] = useActionState(updateTournament, emptyFormState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <FormStatus state={state} />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="upd-name">Tournament name</label>
          <input
            id="upd-name"
            className="input"
            name="name"
            defaultValue={defaultName}
            required
            minLength={3}
            maxLength={120}
          />
        </div>
        <div>
          <label className="label" htmlFor="upd-wa">WhatsApp group URL</label>
          <input
            id="upd-wa"
            className="input"
            name="whatsapp_group_url"
            defaultValue={defaultWhatsAppUrl ?? ''}
            placeholder="https://chat.whatsapp.com/..."
            inputMode="url"
          />
        </div>
      </div>
      <SubmitButton className="btn btn-ghost" pendingLabel="Saving...">Save changes</SubmitButton>
    </form>
  );
}
