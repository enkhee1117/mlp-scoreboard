import { describe, expect, it } from 'vitest';
import type { StandingsMatch } from './scoring';
import {
  ALL_PLAYOFF_LABELS,
  PLAYOFF_ROUND_LABELS,
  SEMI_LOSER_PLACEHOLDERS,
  SEMI_WINNER_PLACEHOLDERS,
  fixedPartnerOnePoolTeams,
  fixedPartnerTwoPoolTeams,
  rotatingPartnerDraftTeams,
  seedSinglePoolPlayoffs,
  seedTwoPoolPlayoffs,
  semiOutcomeLabels,
} from './playoffs';
import { computePlayerStandings, computeStandings } from './scoring';

// A fixed-partners round-robin between 4 teams with deterministic outcomes.
function fixedPartnersFixture(): StandingsMatch[] {
  // Final standings the constructor wants:
  //   1. Falcons (3-0)
  //   2. Hawks   (2-1)
  //   3. Owls    (1-2)
  //   4. Crows   (0-3)
  return [
    match('Falcons', 'Hawks', 'a', 11, 6),
    match('Falcons', 'Owls', 'a', 11, 4),
    match('Falcons', 'Crows', 'a', 11, 2),
    match('Hawks', 'Owls', 'a', 11, 8),
    match('Hawks', 'Crows', 'a', 11, 5),
    match('Owls', 'Crows', 'a', 11, 9),
  ];
}

function match(
  a: string,
  b: string,
  winner: 'a' | 'b',
  scoreA: number,
  scoreB: number,
): StandingsMatch {
  return {
    id: `${a}-vs-${b}`,
    team_a_label: a,
    team_b_label: b,
    winner_side: winner,
    team_a_score: scoreA,
    team_b_score: scoreB,
    games_won_a: winner === 'a' ? 1 : 0,
    games_won_b: winner === 'b' ? 1 : 0,
  };
}

describe('fixedPartnerOnePoolTeams', () => {
  it('returns the top 4 teams in standings order', () => {
    const standings = computeStandings(fixedPartnersFixture());
    expect(fixedPartnerOnePoolTeams(standings)).toEqual([
      'Falcons',
      'Hawks',
      'Owls',
      'Crows',
    ]);
  });

  it('returns null when fewer than 4 teams have a ranking', () => {
    const matches: StandingsMatch[] = [
      match('A', 'B', 'a', 11, 5),
      match('A', 'C', 'a', 11, 6),
      match('B', 'C', 'a', 11, 8),
    ];
    expect(fixedPartnerOnePoolTeams(computeStandings(matches))).toBeNull();
  });
});

describe('fixedPartnerTwoPoolTeams', () => {
  it('crosses over Pool A #1 vs Pool B #2 and Pool B #1 vs Pool A #2', () => {
    const poolA = computeStandings([
      match('A1', 'A2', 'a', 11, 8),
      match('A1', 'A3', 'a', 11, 5),
      match('A2', 'A3', 'a', 11, 9),
    ]);
    const poolB = computeStandings([
      match('B1', 'B2', 'a', 11, 6),
      match('B1', 'B3', 'a', 11, 4),
      match('B2', 'B3', 'a', 11, 7),
    ]);
    expect(fixedPartnerTwoPoolTeams(poolA, poolB)).toEqual(['A1', 'B2', 'B1', 'A2']);
  });

  it('returns null when either pool is short', () => {
    const single = computeStandings([match('Solo', 'Other', 'a', 11, 5)]);
    expect(fixedPartnerTwoPoolTeams(single, [])).toBeNull();
  });
});

describe('rotatingPartnerDraftTeams', () => {
  it('drafts 4 teams: top 4 picking from ranks 5-8 in seed order', () => {
    // Eight rotating-partner matches where players have predictable wins.
    // We construct standings directly to avoid building a rotating fixture.
    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map((p, i) => ({
      team: p,
      matchesPlayed: 8 - i,
      matchWins: 8 - i,
      matchLosses: i,
      winPct: (8 - i) / 8,
      pointDiff: (8 - i) * 2,
      pointsFor: 50 + (8 - i),
      pointsAgainst: 30 + i,
      gamesWon: 8 - i,
      gamesLost: i,
    }));
    expect(rotatingPartnerDraftTeams(players)).toEqual([
      'P1 & P5',
      'P2 & P6',
      'P3 & P7',
      'P4 & P8',
    ]);
  });

  it('returns null when fewer than 8 players are ranked', () => {
    const seven = Array.from({ length: 7 }).map((_, i) => ({
      team: `P${i + 1}`,
      matchesPlayed: 1,
      matchWins: 1,
      matchLosses: 0,
      winPct: 1,
      pointDiff: 5,
      pointsFor: 11,
      pointsAgainst: 6,
      gamesWon: 1,
      gamesLost: 0,
    }));
    expect(rotatingPartnerDraftTeams(seven)).toBeNull();
  });
});

describe('seedSinglePoolPlayoffs', () => {
  it('produces 4 drafts (2 semis + final + 3rd-place) for fixed partners', () => {
    const result = seedSinglePoolPlayoffs(fixedPartnersFixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('fixed_one_pool');
    expect(result.drafts).toHaveLength(4);
    expect(result.drafts.map((d) => d.round_label)).toEqual(ALL_PLAYOFF_LABELS);
    // Semi 1: top seed vs 4th seed.
    expect(result.drafts[0].team_a_label).toBe('Falcons');
    expect(result.drafts[0].team_b_label).toBe('Crows');
    // Semi 2: 2nd seed vs 3rd seed.
    expect(result.drafts[1].team_a_label).toBe('Hawks');
    expect(result.drafts[1].team_b_label).toBe('Owls');
    // Final/bronze use placeholders until semis are scored.
    expect(result.drafts[2].team_a_label).toBe(
      SEMI_WINNER_PLACEHOLDERS[PLAYOFF_ROUND_LABELS.semi1],
    );
    expect(result.drafts[3].team_b_label).toBe(
      SEMI_LOSER_PLACEHOLDERS[PLAYOFF_ROUND_LABELS.semi2],
    );
  });

  it('detects rotating-partner data and drafts player teams', () => {
    // Two matches where players appear with multiple partners — that's the
    // signal for rotating mode. Build standings from a richer fixture.
    const matches: StandingsMatch[] = [
      match('P1 & P2', 'P3 & P4', 'a', 11, 5),
      match('P1 & P3', 'P2 & P4', 'a', 11, 7),
      match('P5 & P6', 'P7 & P8', 'a', 11, 4),
      match('P5 & P7', 'P6 & P8', 'a', 11, 6),
      match('P1 & P5', 'P2 & P6', 'a', 11, 9),
      match('P3 & P7', 'P4 & P8', 'b', 5, 11),
      match('P1 & P6', 'P3 & P8', 'a', 11, 8),
      match('P2 & P5', 'P4 & P7', 'b', 7, 11),
    ];
    const result = seedSinglePoolPlayoffs(matches);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('rotating');
    expect(result.drafts).toHaveLength(4);
    // Top 4 players should each be paired with one of P5-P8.
    const players = computePlayerStandings(matches);
    const top4 = new Set(players.slice(0, 4).map((p) => p.team));
    const pool = new Set(players.slice(4, 8).map((p) => p.team));
    for (const t of result.teams) {
      const [hi, lo] = t.split(' & ');
      expect(top4.has(hi) || pool.has(hi)).toBe(true);
      expect(top4.has(lo) || pool.has(lo)).toBe(true);
    }
  });

  it('errors when there is no completed data', () => {
    expect(seedSinglePoolPlayoffs([])).toEqual({
      ok: false,
      error: 'No completed matches to seed playoffs from.',
    });
  });

  it('errors when too few teams are ranked in fixed-partner mode', () => {
    const matches: StandingsMatch[] = [
      match('A', 'B', 'a', 11, 5),
      match('B', 'C', 'a', 11, 6),
    ];
    const result = seedSinglePoolPlayoffs(matches, { mode: 'fixed_one_pool' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/4 teams/);
  });
});

describe('seedTwoPoolPlayoffs', () => {
  it('produces a crossover bracket from two pools', () => {
    const poolA: StandingsMatch[] = [
      match('A1', 'A2', 'a', 11, 8),
      match('A1', 'A3', 'a', 11, 5),
      match('A2', 'A3', 'a', 11, 9),
    ];
    const poolB: StandingsMatch[] = [
      match('B1', 'B2', 'a', 11, 6),
      match('B1', 'B3', 'a', 11, 4),
      match('B2', 'B3', 'a', 11, 7),
    ];
    const result = seedTwoPoolPlayoffs(poolA, poolB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('fixed_two_pools');
    expect(result.teams).toEqual(['A1', 'B2', 'B1', 'A2']);
  });
});

describe('semiOutcomeLabels', () => {
  it('returns the actual team labels based on winner_side', () => {
    expect(semiOutcomeLabels('Tigers', 'Bears', 'a')).toEqual({
      winner: 'Tigers',
      loser: 'Bears',
    });
    expect(semiOutcomeLabels('Tigers', 'Bears', 'b')).toEqual({
      winner: 'Bears',
      loser: 'Tigers',
    });
  });
});
