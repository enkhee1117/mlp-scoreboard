import Link from 'next/link';
import { sendLoginLink } from './actions';
import { TPMark } from '@/components/ui/TPMark';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div
      className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden"
      style={{ background: 'var(--ink)', color: 'var(--paper)' }}
    >
      <svg
        className="pointer-events-none absolute -right-[60px] -top-[40px] opacity-20"
        width="380"
        height="380"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <rect x="20" y="20" width="160" height="160" stroke="var(--court)" strokeWidth="1.5" fill="none" />
        <line x1="20" y1="100" x2="180" y2="100" stroke="var(--court)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="60" y1="20" x2="60" y2="180" stroke="var(--court)" strokeWidth="1" />
        <line x1="140" y1="20" x2="140" y2="180" stroke="var(--court)" strokeWidth="1" />
      </svg>

      <div className="px-[22px] pt-7">
        <TPMark size={36} color="var(--paper)" accent="var(--court)" />
      </div>

      <div className="relative flex flex-1 flex-col justify-end p-[22px]">
        <div className="serif text-[56px] leading-[0.95] tracking-[-0.03em]">
          Run a
          <br />
          tournament
          <br />
          <span className="italic" style={{ color: 'var(--court)' }}>in 90 seconds.</span>
        </div>
        <div className="mt-[18px] max-w-[280px] text-[15px] leading-[1.45] opacity-70">
          Round robin, fixed partners, brackets. Skill-balanced auto-pairings. WhatsApp updates. Less spreadsheet, more pickleball.
        </div>

        {sp.sent && (
          <div
            className="mt-5 rounded-2xl px-3.5 py-2.5 text-sm"
            style={{ background: 'oklch(0.28 0.04 140)', color: 'var(--court)' }}
          >
            Check your inbox for a sign-in link.
          </div>
        )}
        {sp.error && (
          <div
            className="mt-5 rounded-2xl px-3.5 py-2.5 text-sm"
            style={{ background: 'oklch(0.28 0.05 12)', color: 'oklch(0.85 0.1 12)' }}
          >
            {sp.error}
          </div>
        )}

        <form action={sendLoginLink} className="mt-7 grid gap-2.5">
          <input type="hidden" name="next" value={sp.next ?? '/'} />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            placeholder="you@email.com"
            className="rounded-2xl px-5 py-[18px] text-base outline-none"
            style={{
              background: 'oklch(0.24 0.02 100)',
              color: 'var(--paper)',
              border: '1.5px solid oklch(0.32 0.02 100)',
            }}
          />
          <button
            type="submit"
            className="rounded-2xl px-5 py-[18px] text-base font-semibold tracking-tight"
            style={{
              background: 'var(--court)',
              color: 'oklch(0.2 0.04 140)',
              boxShadow: '0 4px 14px oklch(0.2 0.05 100 / 0.12)',
            }}
          >
            Email me a magic link
          </button>
          <Link
            href="/join"
            className="rounded-2xl py-3.5 text-center text-sm font-medium opacity-70"
          >
            I have an invite code →
          </Link>
        </form>

        <div className="mt-3.5 text-center text-[11px] opacity-40">
          By continuing you agree to our terms. We don&rsquo;t spam.
        </div>
      </div>
    </div>
  );
}
