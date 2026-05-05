'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { claimMatchPlayer } from './match/[matchId]/actions';

type Claimable = { id: string; displayName: string };

export function ScoreboardClaimBanner({
  tournamentId,
  claimables,
}: {
  tournamentId: string;
  claimables: Claimable[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (claimables.length === 0) return null;

  const onClaim = async (player: Claimable) => {
    setPending(player.id);
    setError(null);
    // claimMatchPlayer doesn't actually need a real match id — the RPC just
    // verifies tournament membership via the player_id. Pass an empty string
    // so revalidation still hits the tournament page.
    const res = await claimMatchPlayer({ playerId: player.id, tournamentId });
    setPending(null);
    if (!res.ok) {
      setError(res.error ?? 'Could not link that slot.');
      return;
    }
    router.refresh();
  };

  return (
    <div
      className="mx-[18px] mt-3 mb-1 rounded-2xl px-4 py-3.5"
      style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3">
        Pick which player you are
      </div>
      <div className="mt-0.5 text-[12px] text-ink-2">
        Tap your name so scores post to your stats and the roster shows your profile.
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {claimables.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onClaim(c)}
            disabled={pending !== null}
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            {pending === c.id ? 'Linking…' : `I'm ${c.displayName}`}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-1.5 text-[11px]" style={{ color: 'var(--berry)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
