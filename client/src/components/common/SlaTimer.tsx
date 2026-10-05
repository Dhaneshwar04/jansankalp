import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  slaDueAt: string;
  isBreached: number;
  status: string;
}

export const SlaTimer: React.FC<Props> = ({ slaDueAt, isBreached, status }) => {
  if (status === 'resolved' || status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Resolved
      </span>
    );
  }

  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffHours = (due - now) / (1000 * 3600);

  if (isBreached || diffHours <= 0) {
    const overdueHours = Math.abs(Math.round(diffHours));
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-300 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        SLA Breached ({overdueHours}h overdue)
      </span>
    );
  }

  const isUrgent = diffHours < 12;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${
        isUrgent
          ? 'text-amber-800 bg-amber-50 border-amber-300 font-semibold'
          : 'text-slate-700 bg-slate-100 border-slate-200'
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-600' : 'text-slate-500'}`} />
      <span>
        {diffHours < 24
          ? `${Math.round(diffHours)}h left`
          : `${Math.round(diffHours / 24)}d left`}
      </span>
    </span>
  );
};
