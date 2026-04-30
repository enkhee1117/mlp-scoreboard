type Status = 'live' | 'final' | 'upcoming';

const STYLE: Record<Status, string> = {
  live: 'border-red-500/30 bg-red-500/10 text-red-400',
  final: 'border-slate-700 bg-slate-800 text-slate-300',
  upcoming: 'border-volt/30 bg-volt/10 text-volt',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STYLE[status]}`}>
      {status === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
      {status}
    </span>
  );
}
