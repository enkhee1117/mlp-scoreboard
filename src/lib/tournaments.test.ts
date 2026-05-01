import { describe, expect, it } from 'vitest';
import { generateRoundRobinDrafts, normalizeWhatsAppUrl } from '@/lib/tournaments';

describe('normalizeWhatsAppUrl', () => {
  it('returns null for empty values', () => {
    expect(normalizeWhatsAppUrl('')).toBeNull();
    expect(normalizeWhatsAppUrl('   ')).toBeNull();
  });

  it('accepts full whatsapp invite urls', () => {
    expect(normalizeWhatsAppUrl('https://chat.whatsapp.com/ABCDE')).toBe(
      'https://chat.whatsapp.com/ABCDE',
    );
  });

  it('normalizes host-only whatsapp invite urls', () => {
    expect(normalizeWhatsAppUrl('chat.whatsapp.com/ABCDE')).toBe(
      'https://chat.whatsapp.com/ABCDE',
    );
  });

  it('rejects non-whatsapp links', () => {
    expect(normalizeWhatsAppUrl('https://example.com/invite')).toBeNull();
  });
});

describe('generateRoundRobinDrafts', () => {
  it('returns empty drafts when fewer than two players', () => {
    expect(generateRoundRobinDrafts([])).toEqual([]);
    expect(generateRoundRobinDrafts(['Alice'])).toEqual([]);
  });

  it('generates n*(n-1)/2 matches', () => {
    expect(generateRoundRobinDrafts(['A', 'B', 'C', 'D'])).toHaveLength(6);
  });

  it('contains each unique pairing exactly once', () => {
    const drafts = generateRoundRobinDrafts(['A', 'B', 'C']);
    const pairs = new Set(drafts.map((d) => `${d.team_a_label}:${d.team_b_label}`));
    expect(pairs).toEqual(new Set(['A:B', 'A:C', 'B:C']));
  });

  it('rotates courts up to courtCount', () => {
    const drafts = generateRoundRobinDrafts(['A', 'B', 'C', 'D', 'E'], 4);
    const firstFourCourts = drafts.slice(0, 4).map((d) => d.court_label);
    expect(firstFourCourts).toEqual(['Court 1', 'Court 2', 'Court 3', 'Court 4']);
    expect(drafts[4]?.court_label).toBe('Court 1');
  });

  it('groups consecutive matches into rounds based on court count', () => {
    const drafts = generateRoundRobinDrafts(['A', 'B', 'C', 'D', 'E'], 2);
    expect(drafts[0]?.round_label).toBe('Round 1');
    expect(drafts[1]?.round_label).toBe('Round 1');
    expect(drafts[2]?.round_label).toBe('Round 2');
  });

  it('trims whitespace and drops empty player names', () => {
    const drafts = generateRoundRobinDrafts(['  Alice ', '', 'Bob ']);
    expect(drafts.map((d) => `${d.team_a_label}:${d.team_b_label}`)).toEqual(['Alice:Bob']);
  });
});
