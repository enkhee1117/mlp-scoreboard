import type { FormState } from '@/lib/forms';

export function FormStatus({ state, className }: { state?: FormState; className?: string }) {
  if (!state || (!state.error && !state.ok)) return null;
  if (state.error) {
    return (
      <div
        role="alert"
        className={`rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-red-300 ${className ?? ''}`}
      >
        {state.error}
      </div>
    );
  }
  return (
    <div
      role="status"
      className={`rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-emerald-300 ${className ?? ''}`}
    >
      {state.ok}
    </div>
  );
}
