// Server-side helpers for the playoff bracket. Splitting these out lets
// both server actions (tournaments/actions.ts and the score-entry action
// at tournaments/[id]/match/[matchId]/actions.ts) reuse the same logic.

import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import {
  PLAYOFF_ROUND_LABELS,
  SEMI_LABELS,
  SEMI_LOSER_PLACEHOLDERS,
  SEMI_WINNER_PLACEHOLDERS,
  semiOutcomeLabels,
} from '@/lib/playoffs';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// After a semifinal is scored, replace the placeholder labels in the
// dependent Final / 3rd-place rows with the resolved winner / loser.
export async function propagateSemiOutcome(
  supabase: SupabaseClient,
  tournamentId: string,
  matchId: string,
): Promise<void> {
  const { data: scored } = await supabase
    .from('matches')
    .select('id,round_label,division_id,team_a_label,team_b_label,winner_side')
    .eq('id', matchId)
    .single();
  if (!scored) return;
  const semiLabel = SEMI_LABELS.find((l) => l === scored.round_label);
  if (!semiLabel || !scored.winner_side) return;

  const { winner, loser } = semiOutcomeLabels(
    scored.team_a_label as string,
    scored.team_b_label as string,
    scored.winner_side as 'a' | 'b',
  );
  const winnerPlaceholder = SEMI_WINNER_PLACEHOLDERS[semiLabel];
  const loserPlaceholder = SEMI_LOSER_PLACEHOLDERS[semiLabel];

  const dependents = [PLAYOFF_ROUND_LABELS.final, PLAYOFF_ROUND_LABELS.bronze] as const;
  let depQuery = supabase
    .from('matches')
    .select('id,round_label,team_a_label,team_b_label')
    .eq('tournament_id', tournamentId)
    .in('round_label', dependents);
  depQuery = scored.division_id
    ? depQuery.eq('division_id', scored.division_id)
    : depQuery.is('division_id', null);
  const { data: deps } = await depQuery;

  for (const dep of deps ?? []) {
    const isFinal = dep.round_label === PLAYOFF_ROUND_LABELS.final;
    const replacement = isFinal ? winner : loser;
    const placeholder = isFinal ? winnerPlaceholder : loserPlaceholder;
    const update: Partial<{ team_a_label: string; team_b_label: string }> = {};
    if (dep.team_a_label === placeholder) update.team_a_label = replacement;
    if (dep.team_b_label === placeholder) update.team_b_label = replacement;
    if (Object.keys(update).length === 0) continue;
    await supabase.from('matches').update(update).eq('id', dep.id as string);
  }
}
