'use client';

import { useFormStatus } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`relative inline-flex items-center justify-center gap-2 ${
        pending ? 'cursor-wait opacity-80' : ''
      } ${className ?? ''}`}
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
      <span>{pending ? pendingLabel ?? 'Working...' : children}</span>
    </button>
  );
}
