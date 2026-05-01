'use client';

import { useActionState } from 'react';
import { saveProfile } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';
import type { Profile } from '@/lib/types';

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(saveProfile, emptyFormState);
  return (
    <form action={formAction} className="card space-y-4">
      <h1 className="font-display text-xl font-bold">My profile</h1>
      <FormStatus state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-display">Display name</label>
          <input
            id="pf-display"
            className="input"
            name="display_name"
            defaultValue={profile.display_name ?? ''}
            required
            maxLength={80}
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-full">Full name</label>
          <input
            id="pf-full"
            className="input"
            name="full_name"
            defaultValue={profile.full_name ?? ''}
            maxLength={120}
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-gender">Gender (for mixed-doubles assignments)</label>
          <select id="pf-gender" className="input" name="gender" defaultValue={profile.gender ?? ''}>
            <option value="">—</option>
            <option value="m">Male</option>
            <option value="f">Female</option>
            <option value="x">Other / prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-dupr">DUPR ID</label>
          <input
            id="pf-dupr"
            className="input"
            name="dupr_id"
            placeholder="e.g. 1234567"
            defaultValue={profile.dupr_id ?? ''}
            maxLength={20}
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-dupr-s">DUPR singles</label>
          <input
            id="pf-dupr-s"
            className="input"
            name="dupr_singles"
            type="number"
            step="0.001"
            min={2}
            max={8}
            defaultValue={profile.dupr_singles ?? ''}
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-dupr-d">DUPR doubles</label>
          <input
            id="pf-dupr-d"
            className="input"
            name="dupr_doubles"
            type="number"
            step="0.001"
            min={2}
            max={8}
            defaultValue={profile.dupr_doubles ?? ''}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pf-bio">Bio</label>
        <textarea
          id="pf-bio"
          className="input min-h-24"
          name="bio"
          defaultValue={profile.bio ?? ''}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Tip: paste your DUPR ID — your public profile lives at{' '}
          <span className="font-mono">dashboard.dupr.com/dashboard/player/&lt;id&gt;</span>.
        </p>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving...">Save</SubmitButton>
      </div>
    </form>
  );
}
