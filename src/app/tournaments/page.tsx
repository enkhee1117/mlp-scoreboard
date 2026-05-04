import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CreateTournamentForm } from './_components/CreateTournamentForm';
import type { Tournament } from '@/lib/types';

type TournamentMemberRow = {
  role: string;
  tournaments: Tournament | null;
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rows: TournamentMemberRow[] = [];
  if (user) {
    const { data } = await supabase
      .from('tournament_members')
      .select('role,tournaments(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    rows = (data as TournamentMemberRow[] | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="font-display text-3xl font-bold">My tournaments</h1>
        <p className="mt-2 text-sm text-text-muted">
          Create and manage your own tournaments. Players and matches are scoped per tournament.
        </p>
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
        <h2 className="font-display text-xl font-semibold">Create tournament</h2>
        {!user ? (
          <p className="mt-2 text-sm text-text-muted">
            <Link href="/login?next=/tournaments" className="font-semibold text-volt hover:text-volt-hover">
              Sign in
            </Link>{' '}
            to create a tournament.
          </p>
        ) : (
          <CreateTournamentForm />
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your tournaments</h2>
          <Link href="/history" className="text-sm font-semibold text-volt hover:text-volt-hover">
            Open history
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">
            {user ? 'No tournaments yet. Create your first one above.' : 'Sign in to see your tournaments.'}
          </p>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const t = r.tournaments;
              if (!t) return null;
              return (
                <Link
                  key={`${t.id}-${r.role}`}
                  href={`/tournaments/${t.id}`}
                  className="rounded-lg border border-border-dark bg-dark-bg px-4 py-3 transition hover:border-volt/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold hover:text-volt">{t.name}</h3>
                      <p className="text-xs text-text-muted">
                        format: {t.format} - status: {t.status} - role: {r.role}
                      </p>
                    </div>
                    {t.whatsapp_group_url ? (
                      <span className="text-xs text-emerald-300">WhatsApp linked</span>
                    ) : (
                      <span className="text-xs text-text-muted">No WhatsApp link</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
