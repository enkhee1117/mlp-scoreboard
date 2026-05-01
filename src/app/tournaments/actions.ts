'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fieldInt, fieldString, formatPgError, type FormState } from '@/lib/forms';
import {
  normalizeWhatsAppUrl,
  validateOptionalEmail,
  validatePlayerCount,
  validatePlayerName,
  validateTournamentFormat,
  validateTournamentName,
  validateWhatsAppUrl,
} from '@/lib/validation';
import { generateMatchDrafts, type MatchScheme } from '@/lib/match-schemes';

async function getAuthedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createTournament(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = fieldString(formData, 'name');
  const format = fieldString(formData, 'format') || 'round_robin';
  const whatsappRaw = fieldString(formData, 'whatsapp_group_url');
  const playerCount = fieldInt(formData, 'player_count', 0, 0, 64);

  const checks = [
    validateTournamentName(name),
    validateTournamentFormat(format),
    validateWhatsAppUrl(whatsappRaw),
    validatePlayerCount(playerCount),
  ];
  for (const c of checks) if (!c.ok) return { error: c.error };

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in to create a tournament.' };

  const { data: newId, error } = await supabase.rpc('app_create_tournament', {
    p_name: name,
    p_format: format,
    p_whatsapp_group_url: normalizeWhatsAppUrl(whatsappRaw),
    p_player_count: playerCount,
  });

  if (error) return { error: formatPgError(error) };

  revalidatePath('/tournaments');
  revalidatePath('/');
  redirect(`/tournaments/${newId as string}?ok=Tournament%20created`);
}

export async function updateTournament(_prev: FormState, formData: FormData): Promise<FormState> {
  const tournamentId = fieldString(formData, 'tournament_id');
  const name = fieldString(formData, 'name');
  const whatsappRaw = fieldString(formData, 'whatsapp_group_url');

  if (!tournamentId) return { error: 'Missing tournament id.' };
  const checks = [validateTournamentName(name), validateWhatsAppUrl(whatsappRaw)];
  for (const c of checks) if (!c.ok) return { error: c.error };

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in to update this tournament.' };

  const { error } = await supabase.rpc('app_update_tournament', {
    p_tournament_id: tournamentId,
    p_name: name,
    p_whatsapp_group_url: normalizeWhatsAppUrl(whatsappRaw),
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath('/tournaments');
  return { ok: 'Saved.' };
}

export async function addTournamentPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const tournamentId = fieldString(formData, 'tournament_id');
  const displayName = fieldString(formData, 'display_name');
  const email = fieldString(formData, 'email');

  if (!tournamentId) return { error: 'Missing tournament id.' };
  for (const c of [validatePlayerName(displayName), validateOptionalEmail(email)]) {
    if (!c.ok) return { error: c.error };
  }

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in.' };

  const { error } = await supabase.rpc('app_add_tournament_player', {
    p_tournament_id: tournamentId,
    p_display_name: displayName,
    p_email: email || null,
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: 'Player added.' };
}

export async function renameTournamentPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const playerId = fieldString(formData, 'player_id');
  const tournamentId = fieldString(formData, 'tournament_id');
  const displayName = fieldString(formData, 'display_name');

  if (!playerId || !tournamentId) return { error: 'Missing identifiers.' };
  const c = validatePlayerName(displayName);
  if (!c.ok) return { error: c.error };

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in.' };

  const { error } = await supabase.rpc('app_rename_tournament_player', {
    p_player_id: playerId,
    p_display_name: displayName,
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: 'Saved.' };
}

export async function removeTournamentPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const playerId = fieldString(formData, 'player_id');
  const tournamentId = fieldString(formData, 'tournament_id');
  if (!playerId || !tournamentId) return { error: 'Missing identifiers.' };

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in.' };

  const { error } = await supabase.rpc('app_remove_tournament_player', { p_player_id: playerId });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: 'Player removed.' };
}

export async function generateMatches(_prev: FormState, formData: FormData): Promise<FormState> {
  const tournamentId = fieldString(formData, 'tournament_id');
  const scheme = (fieldString(formData, 'scheme') || 'rotating_partners') as MatchScheme;
  const courts = fieldInt(formData, 'courts', 2, 1, 16);
  const rounds = fieldInt(formData, 'rounds', 5, 1, 50);

  if (!tournamentId) return { error: 'Missing tournament id.' };
  if (!['rotating_partners', 'fixed_partners', 'single_elimination'].includes(scheme)) {
    return { error: 'Pick a valid generation scheme.' };
  }

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in.' };

  const { data: roster, error: rosterErr } = await supabase
    .from('tournament_players')
    .select('display_name')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (rosterErr) return { error: formatPgError(rosterErr) };

  const players = (roster ?? []).map((r) => r.display_name as string).filter(Boolean);
  if (players.length < 4) return { error: 'Add at least 4 players to generate doubles matches.' };
  if (scheme !== 'rotating_partners' && players.length % 2 !== 0) {
    return { error: 'This scheme needs an even number of players (each team is two).' };
  }

  const drafts =
    scheme === 'rotating_partners'
      ? generateMatchDrafts({ scheme, players, rounds, courts })
      : scheme === 'fixed_partners'
        ? generateMatchDrafts({ scheme, players, courts })
        : generateMatchDrafts({ scheme, players, courts });

  if (drafts.length === 0) return { error: 'No matches were produced for that scheme.' };

  const { data: count, error } = await supabase.rpc('app_replace_pending_matches', {
    p_tournament_id: tournamentId,
    p_matches: drafts,
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath('/scoreboard');
  revalidatePath(`/scoreboard/${tournamentId}`);
  return { ok: `Generated ${count ?? drafts.length} matches.` };
}

export async function scoreMatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const matchId = fieldString(formData, 'match_id');
  const tournamentId = fieldString(formData, 'tournament_id');
  const aRaw = fieldString(formData, 'team_a_score');
  const bRaw = fieldString(formData, 'team_b_score');
  if (!matchId || !tournamentId) return { error: 'Missing identifiers.' };

  const a = aRaw === '' ? null : Math.trunc(Number(aRaw));
  const b = bRaw === '' ? null : Math.trunc(Number(bRaw));
  if (a !== null && (!Number.isFinite(a) || a < 0 || a > 999)) return { error: 'Score must be 0-999.' };
  if (b !== null && (!Number.isFinite(b) || b < 0 || b > 999)) return { error: 'Score must be 0-999.' };

  const { supabase, user } = await getAuthedClient();
  if (!user) return { error: 'Please sign in.' };

  const { error } = await supabase.rpc('app_score_match', {
    p_match_id: matchId,
    p_team_a_score: a,
    p_team_b_score: b,
  });
  if (error) return { error: formatPgError(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath('/scoreboard');
  revalidatePath('/');
  return { ok: 'Score saved.' };
}
