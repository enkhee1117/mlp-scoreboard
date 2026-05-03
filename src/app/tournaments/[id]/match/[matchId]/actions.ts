'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveMatchScore({
  matchId,
  scoreA,
  scoreB,
}: {
  matchId: string;
  scoreA: number;
  scoreB: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: existing, error: fetchError } = await supabase
    .from('matches')
    .select('tournament_id')
    .eq('id', matchId)
    .single();
  if (fetchError || !existing) return { ok: false, error: 'Match not found' };

  const { error } = await supabase
    .from('matches')
    .update({
      team_a_score: scoreA,
      team_b_score: scoreB,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/tournaments/${existing.tournament_id}`);
  return { ok: true };
}
