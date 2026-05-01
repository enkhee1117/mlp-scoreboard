import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddPlayerForm } from '@/app/tournaments/_components/AddPlayerForm';
import { GenerateMatchesForm } from '@/app/tournaments/_components/GenerateMatchesForm';
import { PlayerRow } from '@/app/tournaments/_components/PlayerRow';
import { ScoreMatchForm } from '@/app/tournaments/_components/ScoreMatchForm';
import { UpdateTournamentForm } from '@/app/tournaments/_components/UpdateTournamentForm';
import type { Tournament } from '@/lib/types';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
};

type PlayerRowData = {
  id: string;
  display_name: string;
  email: string | null;
  profile_id: string | null;
  created_at: string;
};

type MatchRow = {
  id: string;
  round_label: string | null;
  court_label: string | null;
  team_a_label: string;
  team_b_label: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_side: 'a' | 'b' | null;
  completed_at: string | null;
};

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: tournament }, { data: players }, { data: matches }, { data: userData }] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase
      .from('tournament_players')
      .select('id,display_name,email,profile_id,created_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('matches')
      .select('id,round_label,court_label,team_a_label,team_b_label,team_a_score,team_b_score,winner_side,completed_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase.auth.getUser(),
  ]);

  if (!tournament) notFound();

  const meId = userData.user?.id;
  let canManage = false;
  if (meId) {
    const { data: member } = await supabase
      .from('tournament_members')
      .select('role')
      .eq('tournament_id', id)
      .eq('user_id', meId)
      .single();
    canManage = !!member && (member.role === 'owner' || member.role === 'organizer');
  }

  const t = tournament as Tournament;
  const p = (players ?? []) as PlayerRowData[];
  const m = (matches ?? []) as MatchRow[];

  const completed = m.filter((row) => row.completed_at);
  const pending = m.filter((row) => !row.completed_at);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">Tournament</p>
            <h1 className="font-display text-3xl font-bold">{t.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              format: {t.format} - status: {t.status} - {p.length} players - {m.length} matches
            </p>
          </div>
          <Link href="/tournaments" className="btn btn-ghost">Back</Link>
        </div>
      </section>

      {sp.ok && (
        <div
          role="status"
          className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-emerald-300"
        >
          {sp.ok}
        </div>
      )}

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">WhatsApp integration</h2>
            <p className="text-xs text-text-muted">Use a group chat instead of a built-in chat. Optional.</p>
          </div>
          {t.whatsapp_group_url && (
            <a
              className="btn btn-primary"
              href={t.whatsapp_group_url}
              target="_blank"
              rel="noreferrer"
            >
              Open group
            </a>
          )}
        </div>
        {canManage ? (
          <UpdateTournamentForm
            tournamentId={t.id}
            defaultName={t.name}
            defaultWhatsAppUrl={t.whatsapp_group_url}
          />
        ) : (
          <p className="text-sm text-text-muted">
            {t.whatsapp_group_url ? 'Tap above to open the group chat.' : 'No WhatsApp link set yet.'}
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Players</h2>
            <span className="text-xs text-text-muted">{p.length} total</span>
          </div>
          {canManage && <AddPlayerForm tournamentId={t.id} />}
          <div className="mt-4 space-y-2">
            {p.length === 0 ? (
              <p className="text-sm text-text-muted">No players yet.</p>
            ) : (
              p.map((player) => (
                <PlayerRow
                  key={player.id}
                  tournamentId={t.id}
                  playerId={player.id}
                  defaultName={player.display_name}
                  email={player.email}
                  linkedToProfile={!!player.profile_id}
                  canManage={canManage}
                />
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Matches</h2>
            <span className="text-xs text-text-muted">{m.length} total</span>
          </div>
          {canManage && <GenerateMatchesForm tournamentId={t.id} playerCount={p.length} />}

          <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider text-text-muted">In progress</h3>
          {pending.length === 0 ? (
            <p className="mt-1 text-sm text-text-muted">
              {p.length < 2
                ? 'Add at least two players, then generate matches.'
                : 'No matches yet. Generate a round-robin to fill the schedule.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pending.map((match) => (
                <li key={match.id} className="rounded-md border border-border-dark bg-dark-bg px-3 py-2">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    {match.round_label ?? 'Round'} - {match.court_label ?? 'Court'}
                  </p>
                  <p className="mt-1 font-medium">
                    {match.team_a_label} vs {match.team_b_label}
                  </p>
                  {canManage && (
                    <div className="mt-2">
                      <ScoreMatchForm
                        tournamentId={t.id}
                        matchId={match.id}
                        defaultA={match.team_a_score}
                        defaultB={match.team_b_score}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {completed.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-text-muted">Completed</h3>
              <ul className="mt-2 space-y-2">
                {completed.map((match) => (
                  <li
                    key={match.id}
                    className="rounded-md border border-border-dark bg-dark-bg px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      {match.round_label ?? 'Round'} - {match.court_label ?? 'Court'}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className={match.winner_side === 'a' ? 'font-bold text-volt' : ''}>
                        {match.team_a_label}
                      </span>
                      <span className="font-display text-xl font-bold tabular-nums">
                        {match.team_a_score}-{match.team_b_score}
                      </span>
                      <span className={match.winner_side === 'b' ? 'font-bold text-volt' : ''}>
                        {match.team_b_label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
