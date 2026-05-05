'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formatPgError } from '@/lib/forms';
import { validateTournamentFormat, validateTournamentName } from '@/lib/validation';
import { generateMatchDrafts, type MatchScheme } from '@/lib/match-schemes';

type WizardFormat = 'rr-mixed' | 'rr-same' | 'fp-mixed' | 'fp-same' | 'round_robin' | 'fixed_partners' | 'bracket';
type WizardPairing = 'balanced' | 'random' | 'snake' | 'manual';

type CreateInput = {
  name: string;
  format: WizardFormat;
  pairing?: WizardPairing;
  playerCount?: number;
  playerNames?: string[];
  courts?: number;
  rounds?: number;
};

type CreateResult =
  | { id: string; matchesGenerated: number; manualTeams: boolean; error?: undefined }
  | { id?: undefined; matchesGenerated?: undefined; manualTeams?: undefined; error: string };

function dbFormat(f: WizardFormat): 'round_robin' | 'fixed_partners' | 'bracket' {
  if (f === 'fp-mixed' || f === 'fp-same' || f === 'fixed_partners') return 'fixed_partners';
  if (f === 'bracket') return 'bracket';
  return 'round_robin';
}

function pickScheme(f: WizardFormat): MatchScheme {
  return dbFormat(f) === 'fixed_partners' ? 'fixed_partners' : 'rotating_partners';
}

export async function createTournamentClient(input: CreateInput): Promise<CreateResult> {
  const dbFmt = dbFormat(input.format);
  for (const c of [validateTournamentName(input.name), validateTournamentFormat(dbFmt)]) {
    if (!c.ok) return { error: c.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Please sign in to create a tournament.' };
  }

  // Use the named-roster length when provided so the placeholder seed count
  // matches what the user typed. We rename right after creation.
  const cleanedNames = (input.playerNames ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .slice(0, 64);
  const seedCount = cleanedNames.length > 0 ? cleanedNames.length : (input.playerCount ?? 0);

  const { data: newId, error } = await supabase.rpc('app_create_tournament', {
    p_name: input.name,
    p_format: dbFmt,
    p_whatsapp_group_url: null,
    p_player_count: seedCount,
  });

  if (error || !newId) {
    return { error: error ? formatPgError(error) : 'Could not create tournament.' };
  }
  const tournamentId = newId as string;

  // If the organizer typed real names, replace placeholders in roster order.
  if (cleanedNames.length > 0) {
    const { data: rosterRows } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });
    const ids = (rosterRows ?? []).map((r) => (r as { id: string }).id);
    for (let i = 0; i < cleanedNames.length && i < ids.length; i += 1) {
      const { error: renameErr } = await supabase.rpc('app_rename_tournament_player', {
        p_player_id: ids[i],
        p_display_name: cleanedNames[i],
      });
      if (renameErr) {
        revalidatePath('/tournaments');
        return { id: tournamentId, matchesGenerated: 0, manualTeams: false };
      }
    }
  }

  // Generate Round 1+ unless the organizer explicitly chose manual teams for
  // a fixed-partners draw — in that case we hand off to the roster screen.
  const manualTeams = dbFmt === 'fixed_partners' && input.pairing === 'manual';
  let matchesGenerated = 0;
  if (!manualTeams) {
    const { data: roster } = await supabase
      .from('tournament_players')
      .select('display_name')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });
    const players = ((roster ?? []) as { display_name: string }[])
      .map((r) => r.display_name)
      .filter(Boolean);

    const scheme = pickScheme(input.format);
    const courts = Math.max(1, Math.min(16, input.courts ?? 2));
    const rounds = Math.max(1, Math.min(50, input.rounds ?? 5));

    let drafts: ReturnType<typeof generateMatchDrafts> = [];
    if (players.length >= 4 && (scheme === 'rotating_partners' || players.length % 2 === 0)) {
      drafts =
        scheme === 'rotating_partners'
          ? generateMatchDrafts({ scheme, players, rounds, courts })
          : generateMatchDrafts({ scheme, players, courts });
    }

    if (drafts.length > 0) {
      const { data: count, error: genErr } = await supabase.rpc('app_replace_pending_matches', {
        p_tournament_id: tournamentId,
        p_division_id: null,
        p_matches: drafts,
      });
      if (!genErr) {
        matchesGenerated = (count as number | null) ?? drafts.length;
      }
    }
  }

  revalidatePath('/tournaments');
  revalidatePath(`/tournaments/${tournamentId}`);
  return { id: tournamentId, matchesGenerated, manualTeams };
}
