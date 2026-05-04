// Tournament lifecycle status transitions.
//
// status flows: draft → active → completed
//
// Rules:
// - draft: nothing scheduled yet (zero matches).
// - active: at least one match exists and at least one is not yet completed.
// - completed: at least one match exists and every match is completed.
//
// We re-evaluate on every match insert (generateMatches /
// generatePlayoffs) and every match score (scoreMatch / saveMatchScore),
// so a tournament that gets a new round of matches added drops back to
// active automatically.

import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function refreshTournamentStatus(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<void> {
  const { count: total } = await supabase
    .from('matches')
    .select('id', { head: true, count: 'exact' })
    .eq('tournament_id', tournamentId);
  const { count: pending } = await supabase
    .from('matches')
    .select('id', { head: true, count: 'exact' })
    .eq('tournament_id', tournamentId)
    .is('completed_at', null);

  const totalCount = total ?? 0;
  const pendingCount = pending ?? 0;

  let next: 'draft' | 'active' | 'completed';
  if (totalCount === 0) next = 'draft';
  else if (pendingCount === 0) next = 'completed';
  else next = 'active';

  // Don't churn the row if the status already matches.
  const { data: current } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', tournamentId)
    .single();
  if (!current || current.status === next) return;

  await supabase.from('tournaments').update({ status: next }).eq('id', tournamentId);
}
