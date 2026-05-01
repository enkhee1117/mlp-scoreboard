import type { PostgrestError } from '@supabase/supabase-js';

export type FormState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const emptyFormState: FormState = {};

const PG_ERROR_MESSAGE_MAP: Record<string, string> = {
  '28000': 'Please sign in to continue.',
  '42501': "You don't have permission to do that.",
  '23505': 'That value is already taken.',
  '02000': 'That record could not be found.',
};

export function formatPgError(error: PostgrestError | null | undefined, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  if (error.code && PG_ERROR_MESSAGE_MAP[error.code]) return PG_ERROR_MESSAGE_MAP[error.code];
  if (error.message) {
    const cleaned = error.message
      .replace(/^"[^"]+"\s*\(.*?\):\s*/, '')
      .replace(/^ERROR:\s*/, '')
      .replace(/^new row violates row-level security policy.*$/i, "You don't have permission to do that.");
    return cleaned || fallback;
  }
  return fallback;
}

export function fieldString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function fieldOptionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function fieldInt(formData: FormData, key: string, fallback = 0, min = 0, max = 1_000_000): number {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return fallback;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
