'use client';

import { useActionState, useMemo, useState } from 'react';
import { generateMatches } from '../actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormStatus } from '@/components/ui/FormStatus';
import { emptyFormState } from '@/lib/forms';

type Props = {
  tournamentId: string;
  playerCount: number;
};

const SCHEMES = [
  {
    id: 'rotating_partners',
    title: 'Rotating partners',
    blurb:
      'Social mixer. Players are reshuffled each round into 2v2 games. Best for casual play with mixed skill levels.',
    needsRounds: true,
  },
  {
    id: 'fixed_partners',
    title: 'Fixed partners',
    blurb:
      'Pairs adjacent players into fixed teams, then each team plays every other team once (circle method).',
    needsRounds: false,
  },
  {
    id: 'single_elimination',
    title: 'Single elimination',
    blurb:
      'Bracket: pairs adjacent players into teams, then seeds them into a knockout. Round 1 is generated; later rounds are added when winners are decided.',
    needsRounds: false,
  },
] as const;

export function GenerateMatchesForm({ tournamentId, playerCount }: Props) {
  const [state, formAction] = useActionState(generateMatches, emptyFormState);
  const [scheme, setScheme] = useState<(typeof SCHEMES)[number]['id']>('rotating_partners');
  const [rounds, setRounds] = useState(5);
  const [courts, setCourts] = useState(2);

  const preview = useMemo(() => {
    if (playerCount < 4) return 'Add at least 4 players first.';
    if (scheme === 'rotating_partners') {
      const gamesPerRound = Math.floor(playerCount / 4);
      const sittingOut = playerCount - gamesPerRound * 4;
      const total = rounds * gamesPerRound;
      return `~${total} games over ${rounds} rounds (${gamesPerRound} courts active${
        sittingOut ? `, ${sittingOut} player(s) sit out each round` : ''
      }).`;
    }
    if (scheme === 'fixed_partners') {
      if (playerCount % 2 !== 0) return 'Needs an even number of players.';
      const teams = playerCount / 2;
      const games = (teams * (teams - 1)) / 2;
      return `${teams} teams, ${teams - 1} rounds, ${games} games total.`;
    }
    if (scheme === 'single_elimination') {
      if (playerCount % 2 !== 0) return 'Needs an even number of players.';
      const teams = playerCount / 2;
      let bracket = 1;
      while (bracket < teams) bracket *= 2;
      const round1 = teams - (bracket - teams);
      return `${teams} teams (bracket of ${bracket}), Round 1: up to ${Math.floor(round1 / 2)} games. Add later rounds after R1 finishes.`;
    }
    return '';
  }, [scheme, rounds, playerCount]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <fieldset className="space-y-2">
        <legend className="label">Pairing scheme</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCHEMES.map((s) => (
            <label
              key={s.id}
              className={`block cursor-pointer rounded-md border px-3 py-2 transition ${
                scheme === s.id
                  ? 'border-volt/60 bg-volt/10'
                  : 'border-border-dark bg-dark-bg hover:border-volt/30'
              }`}
            >
              <input
                type="radio"
                name="scheme"
                value={s.id}
                checked={scheme === s.id}
                onChange={() => setScheme(s.id)}
                className="sr-only"
              />
              <p className="font-display text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-xs text-text-muted">{s.blurb}</p>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="gm-courts">Courts</label>
          <input
            id="gm-courts"
            className="input !py-1"
            name="courts"
            type="number"
            min={1}
            max={16}
            inputMode="numeric"
            value={courts}
            onChange={(e) => setCourts(Math.max(1, Math.min(16, Number(e.target.value) || 1)))}
          />
        </div>
        {scheme === 'rotating_partners' && (
          <div>
            <label className="label" htmlFor="gm-rounds">Rounds</label>
            <input
              id="gm-rounds"
              className="input !py-1"
              name="rounds"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              value={rounds}
              onChange={(e) => setRounds(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>
        )}
        <div className="sm:col-span-1 sm:flex sm:items-end">
          <p className="text-xs text-text-muted">{preview}</p>
        </div>
      </div>

      <FormStatus state={state} />

      <SubmitButton className="btn btn-primary" pendingLabel="Generating...">
        Generate {playerCount > 0 ? `for ${playerCount} players` : 'matches'}
      </SubmitButton>
      <p className="text-xs text-text-muted">
        Heads up: regenerating wipes any matches that haven&rsquo;t been scored yet. Completed
        matches stay put.
      </p>
    </form>
  );
}
