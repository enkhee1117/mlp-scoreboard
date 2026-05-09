'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { claimMatchPlayer } from './match/[matchId]/actions';

type Claimable = { id: string; displayName: string };

// True if two display names look like the same person — case-insensitive,
// whitespace-trimmed; we also let "Bob" match "Bob Smith" (first-name only
// hit) since a roster typically uses first names.
function looksLikeMe(rosterName: string, viewerName: string): boolean {
  const a = rosterName.trim().toLowerCase();
  const b = viewerName.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const aFirst = a.split(/\s+/)[0];
  const bFirst = b.split(/\s+/)[0];
  return aFirst === b || a === bFirst || aFirst === bFirst;
}

export function ScoreboardClaimBanner({
  tournamentId,
  claimables,
  viewerDisplayName = null,
}: {
  tournamentId: string;
  claimables: Claimable[];
  viewerDisplayName?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (claimables.length === 0) return null;

  const onClaim = async (player: Claimable) => {
    setPending(player.id);
    setError(null);
    const res = await claimMatchPlayer({ playerId: player.id, tournamentId });
    setPending(null);
    if (!res.ok) {
      setError(res.error ?? 'Could not link that slot.');
      return;
    }
    router.refresh();
  };

  // Only run the "confident match" CTA when exactly ONE roster row looks
  // like the viewer's profile name. Two roster rows named "Sam" with the
  // viewer's profile "Sam Smith" would otherwise pick the first arbitrarily
  // and prompt them to claim someone else's slot.
  const matchedClaims =
    viewerDisplayName != null
      ? claimables.filter((c) => looksLikeMe(c.displayName, viewerDisplayName))
      : [];
  const matchedClaim = matchedClaims.length === 1 ? matchedClaims[0] : undefined;
  const others = matchedClaim ? claimables.filter((c) => c.id !== matchedClaim.id) : claimables;

  return (
    <div
      className="mx-[18px] mt-3 mb-1 rounded-2xl px-4 py-3.5"
      style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
    >
      {matchedClaim ? (
        <>
          <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3">
            We think we found you
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClaim(matchedClaim)}
              disabled={pending !== null}
              className="flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: 'var(--court)', color: 'oklch(0.2 0.04 140)' }}
            >
              {pending === matchedClaim.id
                ? 'Linking…'
                : `Yes, I'm ${matchedClaim.displayName}`}
            </button>
          </div>
          {others.length > 0 && (
            <>
              <div className="mt-3 text-[11px] uppercase tracking-[0.06em] text-ink-3">
                Or I&apos;m someone else
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {others.map((c) => (
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
            </>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
      {error && (
        <div className="mt-1.5 text-[11px]" style={{ color: 'var(--berry)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
