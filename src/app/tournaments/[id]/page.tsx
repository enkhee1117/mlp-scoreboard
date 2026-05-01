import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddPlayerForm } from '@/app/tournaments/_components/AddPlayerForm';
import {
  DivisionsPanel,
  type DivisionRow,
} from '@/app/tournaments/_components/DivisionsPanel';
import { PlayerRow } from '@/app/tournaments/_components/PlayerRow';
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
  division_id: string | null;
  created_at: string;
};

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: tournament },
    { data: divisions },
    { data: players },
    { count: matchCount },
    { data: userData },
  ] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase
      .from('divisions')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('tournament_players')
      .select('id,display_name,email,profile_id,division_id,created_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('matches')
      .select('id', { head: true, count: 'exact' })
      .eq('tournament_id', id),
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
  const dvs = (divisions ?? []) as DivisionRow[];
  const p = (players ?? []) as PlayerRowData[];

  const rosterCounts: Record<string, number> = {};
  for (const player of p) {
    if (player.division_id) {
      rosterCounts[player.division_id] = (rosterCounts[player.division_id] ?? 0) + 1;
    }
  }

  const divisionsForRow = dvs.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">Tournament</p>
            <h1 className="font-display text-3xl font-bold">{t.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              status: {t.status} - {p.length} player{p.length === 1 ? '' : 's'} - {matchCount ?? 0} match
              {(matchCount ?? 0) === 1 ? '' : 'es'} - {dvs.length} division{dvs.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/scoreboard/${t.id}`} className="btn btn-primary">
              Score matches
            </Link>
            <Link href="/tournaments" className="btn btn-ghost">
              Back
            </Link>
          </div>
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

      <DivisionsPanel
        tournamentId={t.id}
        divisions={dvs}
        canManage={canManage}
        rosterCounts={rosterCounts}
      />

      <section className="card">
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
                divisionId={player.division_id}
                divisions={divisionsForRow}
              />
            ))
          )}
        </div>
      </section>

      <details className="card group" {...(t.whatsapp_group_url ? { open: true } : {})}>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Settings</h2>
              <p className="text-xs text-text-muted">Tournament name and WhatsApp link</p>
            </div>
            <span className="text-xs text-text-muted group-open:hidden">expand</span>
            <span className="hidden text-xs text-text-muted group-open:inline">collapse</span>
          </div>
        </summary>
        <div className="mt-4 space-y-3">
          {canManage ? (
            <UpdateTournamentForm
              tournamentId={t.id}
              defaultName={t.name}
              defaultWhatsAppUrl={t.whatsapp_group_url}
            />
          ) : (
            <p className="text-sm text-text-muted">
              {t.whatsapp_group_url ? (
                <a
                  href={t.whatsapp_group_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-volt hover:text-volt-hover"
                >
                  Open WhatsApp group
                </a>
              ) : (
                'No WhatsApp link set yet.'
              )}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
