import React from 'react';
import { Modal } from '../common/Modal';
import { Complaint, Constituency, AnalyticsKpi } from '../../types';
import { Printer, Download, Shield, CheckCircle2, Clock, Star, AlertTriangle, Building, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  constituency: Constituency | null;
  kpis: AnalyticsKpi;
  complaints: Complaint[];
  departmentStats?: any[];
  wardStats?: any[];
}

export const ExecutivePrintReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  constituency,
  kpis,
  complaints,
  departmentStats = [],
  wardStats = [],
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const criticalOpen = complaints.filter(
    c => (c.priority === 'critical' || c.priority === 'high') && c.status !== 'resolved' && c.status !== 'closed'
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <span className="text-base font-black text-slate-900">
              Executive Grievance & SLA Accountability Dossier
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      }
      maxWidth="4xl"
    >
      {/* Printable Document Container */}
      <div id="printable-executive-report" className="p-4 sm:p-8 bg-white text-slate-900 text-xs font-sans space-y-6">
        {/* State / Official Government Letterhead */}
        <div className="border-b-2 border-slate-900 pb-5 text-center relative">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-serif font-black text-base text-slate-900 bg-amber-50">
              🏛️
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                GOVERNMENT OF MAHARASHTRA
              </h1>
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                Maharashtra Legislative Assembly (Vidhan Sabha)
              </h2>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 font-semibold mt-1">
            Office of the Member of Legislative Assembly (MLA) • {constituency?.name || 'Shivajinagar Assembly Constituency (AC-209)'}
          </p>
          <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600">
            <span>Representative: <strong>{constituency?.mla_name || 'Hon. Rajesh Shinde (MLA)'}</strong></span>
            <span>Document Ref: <strong>JS/MLA/EXEC-{new Date().getFullYear()}-{Date.now().toString().slice(-4)}</strong></span>
            <span>Date & Time: <strong>{currentDate} at {currentTime}</strong></span>
          </div>
        </div>

        {/* Executive Summary Banner */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            1. Executive Performance Overview (SRS Section 63 KPIs)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Logged</span>
              <span className="text-xl font-black text-slate-900">{kpis.total}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Complaints</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Resolution Rate</span>
              <span className="text-xl font-black text-emerald-600">{kpis.resolutionRate}%</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">{kpis.resolvedTotal} Resolved</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">SLA Compliance</span>
              <span className="text-xl font-black text-blue-600">{kpis.slaComplianceRate}%</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Target &lt;48-120h</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] text-amber-700 font-bold uppercase block">Citizen Rating</span>
              <span className="text-xl font-black text-amber-600">★ {kpis.citizenSatisfaction}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Verified Surveys</span>
            </div>
          </div>
        </div>

        {/* Department Accountability Table */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            2. Departmental Action & Compliance Breakdown
          </h3>
          <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                <th className="p-2 border-r border-slate-300 font-bold">Public Department</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Assigned</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Resolved</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Pending</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">SLA Breached</th>
                <th className="p-2 font-bold text-center">Resolution %</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.length > 0 ? (
                departmentStats.map((d: any, idx: number) => {
                  const rate = d.total_assigned > 0 ? Math.round((d.resolved_count / d.total_assigned) * 100) : 100;
                  return (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {d.name} ({d.code})
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center">{d.total_assigned}</td>
                      <td className="p-2 border-r border-slate-200 text-center text-emerald-700 font-semibold">{d.resolved_count}</td>
                      <td className="p-2 border-r border-slate-200 text-center text-amber-700 font-semibold">{d.pending_count}</td>
                      <td className="p-2 border-r border-slate-200 text-center text-red-700 font-semibold">{d.breached_count}</td>
                      <td className="p-2 text-center font-bold text-slate-900">{rate}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-500 italic">No departmental statistics recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ward-by-Ward Geographical Distribution */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            3. Ward-by-Ward Civic Distribution
          </h3>
          <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                <th className="p-2 border-r border-slate-300 font-bold">Ward Area</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Ward No.</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Total Volume</th>
                <th className="p-2 border-r border-slate-300 font-bold text-center">Resolved</th>
                <th className="p-2 font-bold text-center">Civic Health Status</th>
              </tr>
            </thead>
            <tbody>
              {wardStats.length > 0 ? (
                wardStats.map((w: any, idx: number) => {
                  const resolved = w.resolved || 0;
                  const total = w.count || 0;
                  const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;
                  return (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{w.ward_name}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{w.ward_number || `W-${idx + 1}`}</td>
                      <td className="p-2 border-r border-slate-200 text-center">{total}</td>
                      <td className="p-2 border-r border-slate-200 text-center text-emerald-700 font-semibold">{resolved}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rate >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rate >= 75 ? 'Satisfactory' : 'Needs Intervention'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-500 italic">No ward-level data recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Critical Cases Requiring MLA Direct Follow-up */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
            <span>4. Escalated & Critical Open Grievances ({criticalOpen.length})</span>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
              Immediate Legislative Review
            </span>
          </h3>
          <div className="space-y-2">
            {criticalOpen.slice(0, 5).map(c => (
              <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-[11px]">{c.complaint_number}</span>
                    <span className="font-bold text-slate-900 text-xs">{c.title}</span>
                    <span className="text-[10px] font-bold uppercase text-red-700 bg-red-100 px-1.5 py-0.2 rounded">
                      {c.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                    {c.location_address} • {c.department_name || 'Unassigned'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-amber-700">
                    👍 {c.support_count || 1} Supporters
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Status: <span className="font-semibold uppercase text-blue-600">{c.status}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification and Formal Sign-off */}
        <div className="pt-8 border-t border-slate-300 mt-8 grid grid-cols-2 gap-8 text-[11px]">
          <div>
            <p className="text-slate-500 uppercase font-bold text-[10px]">Verified By</p>
            <div className="h-10 mt-1 flex items-end">
              <span className="font-serif italic text-slate-700 font-bold">Sunita Patil</span>
            </div>
            <p className="font-bold text-slate-900">Chief Constituency Desk Officer</p>
            <p className="text-slate-500 text-[10px]">Office of the MLA, Shivajinagar</p>
          </div>

          <div className="text-right">
            <p className="text-slate-500 uppercase font-bold text-[10px]">Executive Countersign</p>
            <div className="h-10 mt-1 flex items-end justify-end">
              <span className="font-serif italic text-slate-900 font-black text-sm">Rajesh Shinde</span>
            </div>
            <p className="font-bold text-slate-900">Hon. Rajesh Shinde (MLA)</p>
            <p className="text-slate-500 text-[10px]">Member of Legislative Assembly, Maharashtra</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
