import { StatusBadge } from '@/components/ui/StatusBadge';

type MatchCardProps = {
  court: string;
  division: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  status: 'live' | 'final' | 'upcoming';
};

export function MatchCard({
  court,
  division,
  teamA,
  scoreA,
  teamB,
  scoreB,
  status,
}: MatchCardProps) {
  return (
    <div className="rounded-xl border border-border-dark bg-card-bg p-4 transition-colors hover:border-slate-500">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-text-muted">{court} - {division}</p>
        <StatusBadge status={status} />
      </div>
      <div className="space-y-2 font-display">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white">{teamA}</span>
          <span className="text-xl font-bold text-volt tabular-nums">{scoreA}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">{teamB}</span>
          <span className="text-xl text-slate-300 tabular-nums">{scoreB}</span>
        </div>
      </div>
    </div>
  );
}
