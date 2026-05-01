import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScoreMatchForm } from '@/app/tournaments/_components/ScoreMatchForm';

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

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TournamentScoreboard({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, { data: matches }, { data: userData }] = await Promise.all([
    supabase.from('tournaments').select('id,name,format,status').eq('id', id).single(),
    supabase
      .from('matches')
      .select(
        'id,round_label,court_label,team_a_label,team_b_label,team_a_score,team_b_score,winner_side,completed_at',
      )
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
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

  const m = (matches ?? []) as MatchRow[];
  const inProgress = m.filter((x) => !x.completed_at);
  const completed = m.filter((x) => x.completed_at).reverse();

  const wins = new Map<string, number>();
  for (const x of completed) {
    if (x.winner_side === 'a') wins.set(x.team_a_label, (wins.get(x.team_a_label) ?? 0) + 1);
    if (x.winner_side === 'b') wins.set(x.team_b_label, (wins.get(x.team_b_label) ?? 0) + 1);
  }
  const leaderboard = Array.from(wins.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-volt">Scoreboard</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{tournament.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {tournament.format} - {tournament.status} - {m.length} match{m.length === 1 ? '' : 'es'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/scoreboard" className="btn btn-ghost">All scoreboards</Link>
            <Link href={`/tournaments/${id}`} className="btn btn-ghost">Manage</Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">In progress</h2>
          <span className="text-xs text-text-muted">{inProgress.length} active</span>
        </div>
        {inProgress.length === 0 ? (
          <p className="text-sm text-text-muted">
            No matches in progress.{' '}
            {canManage ? (
              <Link href={`/tournaments/${id}`} className="font-semibold text-volt hover:text-volt-hover">
                Generate matches
              </Link>
            ) : (
              'Check back once an organizer schedules a round.'
            )}
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {inProgress.map((match) => (
              <li key={match.id} className="rounded-lg border border-border-dark bg-dark-bg p-3">
                <p className="text-xs uppercase tracking-wider text-text-muted">
                  {match.round_label ?? 'Round'} - {match.court_label ?? 'Court'}
                </p>
                <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
                  <p className="font-medium">{match.team_a_label}</p>
                  <p className="font-display text-2xl font-bold tabular-nums text-text-muted">
                    {match.team_a_score ?? '-'}
                  </p>
                  <p className="font-medium">{match.team_b_label}</p>
                  <p className="font-display text-2xl font-bold tabular-nums text-text-muted">
                    {match.team_b_score ?? '-'}
                  </p>
                </div>
                {canManage && (
                  <div className="mt-3 border-t border-border-dark pt-3">
                    <ScoreMatchForm
                      tournamentId={id}
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
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent results</h2>
            <span className="text-xs text-text-muted">{completed.length} final</span>
          </div>
          {completed.length === 0 ? (
            <p className="text-sm text-text-muted">No completed matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {completed.slice(0, 30).map((match) => (
                <li
                  key={match.id}
                  className="rounded-md border border-border-dark bg-dark-bg px-3 py-2"
                >
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    {match.round_label ?? 'Round'} - {match.court_label ?? 'Court'}
                  </p>
                  <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <span
                      className={
                        match.winner_side === 'a'
                          ? 'font-bold text-volt'
                          : 'text-text-muted'
                      }
                    >
                      {match.team_a_label}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums">
                      {match.team_a_score}
                    </span>
                    <span className={match.winner_side === 'a' ? 'text-xs font-bold text-volt' : 'text-xs text-text-muted'}>
                      {match.winner_side === 'a' ? 'W' : 'L'}
                    </span>
                    <span
                      className={
                        match.winner_side === 'b'
                          ? 'font-bold text-volt'
                          : 'text-text-muted'
                      }
                    >
                      {match.team_b_label}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums">
                      {match.team_b_score}
                    </span>
                    <span className={match.winner_side === 'b' ? 'text-xs font-bold text-volt' : 'text-xs text-text-muted'}>
                      {match.winner_side === 'b' ? 'W' : 'L'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-display text-xl font-semibold">Standings</h2>
          {leaderboard.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Standings will appear once matches finish.</p>
          ) : (
            <ol className="mt-3 space-y-1">
              {leaderboard.map(([team, w], idx) => (
                <li
                  key={team}
                  className="flex items-center justify-between rounded-md border border-border-dark bg-dark-bg px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-xs text-text-muted">#{idx + 1}</span>
                    <span className="font-medium">{team}</span>
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums text-volt">{w}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
