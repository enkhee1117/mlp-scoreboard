'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Avatar, playerFromName } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { searchMyMatches, type SearchedMatch } from './search-action';

export function MatchSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedMatch[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    // Debounce to avoid one RPC per keystroke.
    const timer = setTimeout(() => {
      startTransition(async () => {
        const data = await searchMyMatches(trimmed);
        setResults(data);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();

  return (
    <div className="mb-[18px]">
      <div className="mb-2 text-[10px] uppercase tracking-[0.06em] text-ink-3">
        Search matches by player name
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a player's name…"
        className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-ink outline-none"
        style={{ border: '1px solid var(--line)' }}
      />

      {trimmed.length >= 2 && (
        <div className="mt-2.5">
          {results === null && isPending && (
            <div className="text-[12px] text-ink-3">Searching…</div>
          )}
          {results !== null && results.length === 0 && !isPending && (
            <div className="text-[12px] text-ink-3">
              No matches found with &ldquo;{trimmed}&rdquo;.
            </div>
          )}
          {results !== null && results.length > 0 && (
            <div className="grid gap-2">
              {results.map((m) => (
                <Link
                  key={m.id}
                  href={`/tournaments/${m.tournament_id}/match/${m.id}`}
                  className="block rounded-2xl bg-white p-3"
                  style={{ border: '1px solid var(--line)' }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {m.tournament_name}
                      {m.round_label ? ` · ${m.round_label}` : ''}
                      {m.court_label ? ` · ${m.court_label}` : ''}
                    </div>
                    {m.completed_at ? (
                      <Chip tone="court">FINAL</Chip>
                    ) : (m.team_a_score ?? 0) || (m.team_b_score ?? 0) ? (
                      <Chip tone="live">LIVE</Chip>
                    ) : (
                      <Chip tone="ghost">UPCOMING</Chip>
                    )}
                  </div>
                  <ResultLine
                    label={m.team_a_label}
                    score={m.team_a_score ?? 0}
                    win={m.winner_side === 'a'}
                  />
                  <ResultLine
                    label={m.team_b_label}
                    score={m.team_b_score ?? 0}
                    win={m.winner_side === 'b'}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultLine({ label, score, win }: { label: string; score: number; win: boolean }) {
  const players = label
    .split(/\s*&\s*|\s*\/\s*/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => playerFromName(s));
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="flex">
        <Avatar player={players[0]} size={24} />
        {players[1] && (
          <div className="-ml-2">
            <Avatar player={players[1]} size={24} />
          </div>
        )}
      </div>
      <div
        className="flex-1 truncate text-[13px]"
        style={{ fontWeight: win ? 600 : 500, color: win ? 'var(--ink)' : 'var(--ink-2)' }}
      >
        {label}
      </div>
      <div
        className="mono text-[18px] font-bold"
        style={{ color: win ? 'var(--court-deep)' : 'var(--ink-3)' }}
      >
        {score}
      </div>
    </div>
  );
}
