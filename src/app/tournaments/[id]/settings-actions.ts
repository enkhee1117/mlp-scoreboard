'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatPgError } from '@/lib/forms';

export async function resetTournamentMatches(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get('tournament_id') ?? '').trim();
  if (!tournamentId) redirect('/tournaments');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase.rpc('app_reset_tournament_matches', {
    p_tournament_id: tournamentId,
  });
  if (error) {
    redirect(
      `/tournaments/${tournamentId}?tab=settings&error=${encodeURIComponent(formatPgError(error))}`,
    );
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/invite`);
  revalidatePath('/tournaments');
  redirect(
    `/tournaments/${tournamentId}/invite?ok=${encodeURIComponent(`Cleared ${data ?? 0} matches`)}`,
  );
}

export async function deleteTournament(formData: FormData): Promise<void> {
  const tournamentId = String(formData.get('tournament_id') ?? '').trim();
  if (!tournamentId) redirect('/tournaments');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.rpc('app_delete_tournament', {
    p_tournament_id: tournamentId,
  });
  if (error) {
    redirect(
      `/tournaments/${tournamentId}?tab=settings&error=${encodeURIComponent(formatPgError(error))}`,
    );
  }

  revalidatePath('/tournaments');
  revalidatePath('/');
  revalidatePath('/history');
  redirect(`/tournaments?ok=${encodeURIComponent('Tournament deleted')}`);
}
