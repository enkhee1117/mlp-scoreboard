'use client';

import { useState } from 'react';
import { Avatar, playerFromName } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { removeInvitePlayer, updateInvitePlayer } from './actions';

type Props = {
  tournamentId: string;
  player: {
    id: string;
    display_name: string;
    email: string | null;
    profile_id: string | null;
  };
};

export function RosterRow({ tournamentId, player }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.display_name);
  const [email, setEmail] = useState(player.email ?? '');

  const linked = !!player.profile_id;
  const invited = !linked && !!player.email;
  const status = linked ? 'IN' : invited ? 'INVITED' : 'PLACEHOLDER';
  const tone: 'court' | 'default' | 'ghost' = linked ? 'court' : invited ? 'default' : 'ghost';

  const subtext = linked
    ? 'Signed up · results post to their history'
    : invited
      ? `${player.email} · will link when they sign up`
      : 'Placeholder · tap edit to add an email';

  return (
    <div
      className="rounded-[14px] bg-white px-3.5 py-2.5"
      style={{ border: '1px solid var(--line)' }}
    >
      <div className="flex items-center gap-3">
        <Avatar player={playerFromName(player.display_name)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{player.display_name}</div>
          <div className="truncate text-[11px] text-ink-3">{subtext}</div>
        </div>
        <Chip tone={tone}>{status}</Chip>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
          style={{ color: 'var(--ink-2)', border: '1px solid var(--line)' }}
        >
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid gap-2 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <form action={updateInvitePlayer} className="grid gap-2">
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <input type="hidden" name="player_id" value={player.id} />
            <input
              name="display_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl bg-white px-3 py-2.5 text-sm text-ink outline-none"
              style={{ border: '1px solid var(--line)' }}
              placeholder="Player name"
              maxLength={120}
            />
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="off"
              className="rounded-xl bg-white px-3 py-2.5 text-sm text-ink outline-none"
              style={{ border: '1px solid var(--line)' }}
              placeholder="Email (optional)"
            />
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              Save
            </button>
          </form>
          <form action={removeInvitePlayer}>
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <input type="hidden" name="player_id" value={player.id} />
            <button
              type="submit"
              className="w-full rounded-xl px-3 py-2 text-[13px] font-semibold"
              style={{ color: 'var(--berry)', border: '1px solid var(--berry)', background: 'transparent' }}
            >
              Remove from roster
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
