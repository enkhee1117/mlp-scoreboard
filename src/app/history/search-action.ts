'use server';

import { createClient } from '@/lib/supabase/server';

export type SearchedMatch = {
  id: string;
  tournament_id: string;
  tournament_name: string;
  round_label: string | null;
  court_label: string | null;
  team_a_label: string;
  team_b_label: string;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_side: 'a' | 'b' | null;
  completed_at: string | null;
};

export async function searchMyMatches(query: string): Promise<SearchedMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('app_search_my_matches', {
    p_query: trimmed,
  });
  if (error || !data) return [];
  return (data as SearchedMatch[]).slice(0, 50);
}
