import { describe, expect, it } from 'vitest';
import {
  generateFixedPartners,
  generateRotatingPartners,
  generateSingleElimination,
  generateMatchDrafts,
  type MatchDraft,
} from '@/lib/match-schemes';

// Deterministic rng for tests: linear congruential, seedable.
function seedRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000;
    return s / 0x100000000;
  };
}

const player = (n: number) => `P${n}`;
const players = (n: number) => Array.from({ length: n }, (_, i) => player(i + 1));

describe('generateRotatingPartners', () => {
  it('returns no drafts when fewer than 4 players', () => {
    expect(generateRotatingPartners(players(3), { rounds: 5, courts: 2 })).toEqual([]);
  });

  it('produces rounds * floor(N/4) games', () => {
    const drafts = generateRotatingPartners(players(8), { rounds: 4, courts: 2, rng: seedRng() });
    expect(drafts).toHaveLength(8); // 4 rounds * 2 games
  });

  it('produces 2v2 doubles labels (always contains " & ")', () => {
    const drafts = generateRotatingPartners(players(8), { rounds: 2, courts: 2, rng: seedRng() });
    for (const d of drafts) {
      expect(d.team_a_label).toMatch(/ & /);
      expect(d.team_b_label).toMatch(/ & /);
    }
  });

  it('benches odd extras (5 players → 1 game per round)', () => {
    const drafts = generateRotatingPartners(players(5), { rounds: 3, courts: 2, rng: seedRng() });
    expect(drafts).toHaveLength(3);
  });

  it('rotates court labels up to courts parameter', () => {
    const drafts = generateRotatingPartners(players(12), { rounds: 1, courts: 2, rng: seedRng() });
    const courts = drafts.map((d) => d.court_label);
    expect(courts).toEqual(['Court 1', 'Court 2', 'Court 1']);
  });

  it('partitions each round into disjoint groups of 4', () => {
    const drafts = generateRotatingPartners(players(8), { rounds: 1, courts: 2, rng: seedRng() });
    const named = (s: string) => s.split(' & ');
    const r1players = drafts.flatMap((d) => [...named(d.team_a_label), ...named(d.team_b_label)]);
    expect(new Set(r1players).size).toBe(8);
  });
});

describe('generateFixedPartners', () => {
  it('uses circle method: K teams → K-1 rounds with K/2 games each', () => {
    const drafts = generateFixedPartners(players(8), { courts: 2 });
    // 4 teams → 3 rounds * 2 games = 6 games
    expect(drafts).toHaveLength(6);
  });

  it('every pair of teams plays exactly once', () => {
    const drafts = generateFixedPartners(players(8), { courts: 2 });
    const seen = new Set<string>();
    for (const d of drafts) {
      const key = [d.team_a_label, d.team_b_label].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    // 4 choose 2 = 6 unique matchups
    expect(seen.size).toBe(6);
  });

  it('handles odd team counts with a bye each round', () => {
    // 6 players → 3 teams → odd; circle method adds BYE → 3 rounds, 1 real game each
    const drafts = generateFixedPartners(players(6), { courts: 1 });
    // 3 teams, 3 unique matchups
    expect(drafts).toHaveLength(3);
    const teamSet = new Set(drafts.flatMap((d) => [d.team_a_label, d.team_b_label]));
    for (const team of teamSet) {
      expect(team).not.toBe('BYE');
    }
  });

  it('returns no drafts with fewer than 4 players', () => {
    expect(generateFixedPartners(players(3), { courts: 2 })).toEqual([]);
  });

  it('produces 2v2 doubles labels', () => {
    const drafts = generateFixedPartners(players(8), { courts: 2 });
    for (const d of drafts) {
      expect(d.team_a_label).toMatch(/ & /);
      expect(d.team_b_label).toMatch(/ & /);
    }
  });
});

describe('generateSingleElimination', () => {
  it('round 1 only, with N/2 games for power-of-2 team counts', () => {
    const drafts = generateSingleElimination(players(8), { courts: 2 });
    // 4 teams → 2 round-1 games
    expect(drafts).toHaveLength(2);
    expect(drafts.every((d) => d.round_label === 'Round 1')).toBe(true);
  });

  it('pads with BYEs and skips pairings against BYE', () => {
    // 6 players → 3 teams → padded to 4 (1 BYE)
    // Standard bracket pairs: 1 vs 4, 2 vs 3. Team 4 is BYE so only 2v3 emitted.
    const drafts = generateSingleElimination(players(6), { courts: 2 });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].team_a_label).not.toBe('BYE');
    expect(drafts[0].team_b_label).not.toBe('BYE');
  });

  it('returns no drafts when fewer than 4 players', () => {
    expect(generateSingleElimination(players(3), { courts: 2 })).toEqual([]);
  });

  it('produces 2v2 doubles labels', () => {
    const drafts = generateSingleElimination(players(8), { courts: 2 });
    for (const d of drafts) {
      expect(d.team_a_label).toMatch(/ & /);
      expect(d.team_b_label).toMatch(/ & /);
    }
  });
});

describe('generateMatchDrafts dispatcher', () => {
  const want2v2 = (drafts: MatchDraft[]) => {
    for (const d of drafts) {
      expect(d.team_a_label).toMatch(/ & /);
      expect(d.team_b_label).toMatch(/ & /);
    }
  };
  it('dispatches each scheme', () => {
    want2v2(generateMatchDrafts({ scheme: 'rotating_partners', players: players(8), rounds: 2, courts: 2, rng: seedRng() }));
    want2v2(generateMatchDrafts({ scheme: 'fixed_partners', players: players(8), courts: 2 }));
    want2v2(generateMatchDrafts({ scheme: 'single_elimination', players: players(8), courts: 2 }));
  });
});
