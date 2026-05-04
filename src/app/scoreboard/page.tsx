import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Row = {
  tournament_id: string;
  tournament_name: string;
  format: string;
  status: string;
  total_matches: number;
  pending_matches: number;
};

export default async function ScoreboardIndex() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tournamentIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('tournament_members')
      .select('tournament_id')
      .eq('user_id', user.id);
    tournamentIds = (data ?? []).map((r) => r.tournament_id as string);
  }

  let rows: Row[] = [];
  if (tournamentIds.length > 0) {
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id,name,format,status')
      .in('id', tournamentIds)
      .order('updated_at', { ascending: false });

    rows = await Promise.all(
      (tournaments ?? []).map(async (t) => {
        const [{ count: total }, { count: pending }] = await Promise.all([
          supabase
            .from('matches')
            .select('id', { head: true, count: 'exact' })
            .eq('tournament_id', t.id),
          supabase
            .from('matches')
            .select('id', { head: true, count: 'exact' })
            .eq('tournament_id', t.id)
            .is('completed_at', null),
        ]);
        return {
          tournament_id: t.id as string,
          tournament_name: t.name as string,
          format: t.format as string,
          status: t.status as string,
          total_matches: total ?? 0,
          pending_matches: pending ?? 0,
        };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-volt">Scoreboard</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Pick a tournament</h1>
        <p className="mt-2 text-sm text-text-muted">
          Choose a tournament to see live courts and report scores.
        </p>
      </section>

      {rows.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="text-sm text-text-muted">
            {user ? 'No tournaments yet.' : 'Sign in to see your tournament scoreboards.'}
          </p>
          <Link
            href={user ? '/tournaments' : '/login?next=/scoreboard'}
            className="btn btn-primary mt-3 inline-block"
          >
            {user ? 'Create tournament' : 'Sign in'}
          </Link>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <Link
              key={r.tournament_id}
              href={`/scoreboard/${r.tournament_id}`}
              className="card block p-4 transition hover:border-volt/40"
            >
              <h2 className="font-display text-lg font-semibold hover:text-volt">
                {r.tournament_name}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {r.format} - {r.status}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-display text-2xl font-bold tabular-nums">{r.pending_matches}</span>{' '}
                <span className="text-text-muted">in progress</span>{' '}
                <span className="text-text-muted">/ {r.total_matches} total</span>
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
