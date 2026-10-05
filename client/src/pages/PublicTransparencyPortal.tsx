import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building,
  Award,
  Lock,
} from 'lucide-react';

export const PublicTransparencyPortal: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getPublicStats()
      .then(res => {
        if (res.success) setData(res);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const stats = data?.stats || {
    totalReported: 6,
    totalResolved: 2,
    totalInAction: 4,
    resolutionPercentage: 75.0,
    avgResolutionHours: 28.5,
  };

  return (
    <div className="space-y-6">
      {/* Public Header */}
      <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Public Transparency & Democratic Accountability (Open Data)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
          Constituency Grievance Performance Ledger
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Open citizen oversight of municipal problem resolution, department turnaround speeds, and infrastructure repairs. All data is anonymized to protect citizen privacy.
        </p>
      </div>

      {/* Public KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Total Public Complaints</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalReported}</p>
          <span className="text-[11px] text-slate-500">Citizen reported issues</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 block">Resolution Percentage</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{stats.resolutionPercentage}%</p>
          <span className="text-[11px] text-slate-500">Public issues resolved</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-700 block">Under Active Work</span>
          <p className="text-3xl font-black text-blue-600 mt-1">{stats.totalInAction}</p>
          <span className="text-[11px] text-slate-500">Department crews dispatched</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-purple-700 block">Average Fix Time</span>
          <p className="text-3xl font-black text-purple-600 mt-1">{stats.avgResolutionHours}h</p>
          <span className="text-[11px] text-slate-500">From filing to completion</span>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          Department & Category Redressal Statistics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.categories?.map((cat: any) => (
            <div
              key={cat.name}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                  <span>Reported: <strong>{cat.reported_count || 0}</strong></span>
                  <span className="text-emerald-700 font-bold">
                    Resolved: {cat.resolved_count || 0}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      cat.reported_count > 0
                        ? Math.round(((cat.resolved_count || 0) / cat.reported_count) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Public Resolutions Ledger */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Recently Completed Ground Redressals
          </h3>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Anonymized Public Ledger
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.recentResolutions?.map((r: any) => (
            <div
              key={r.complaint_number}
              className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-800">{r.complaint_number}</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  VERIFIED RESOLVED
                </span>
              </div>
              <h4 className="font-bold text-slate-900 line-clamp-1">{r.title}</h4>
              <p className="text-slate-600 text-[11px] truncate">{r.location_address}</p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Agency: {r.department_name}</span>
                <span>Resolved: {new Date(r.resolved_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
