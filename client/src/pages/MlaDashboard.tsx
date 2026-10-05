import React, { useState, useEffect } from 'react';
import { Complaint, Constituency, AnalyticsKpi } from '../types';
import { ConstituencyComplaintsMap } from '../components/maps/ConstituencyComplaintsMap';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SlaTimer } from '../components/common/SlaTimer';
import { ExecutivePrintReportModal } from '../components/reports/ExecutivePrintReportModal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Download,
  Printer,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertOctagon,
  Star,
  Users,
  Search,
  Filter,
  Eye,
  Building,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSelectComplaint: (complaint: Complaint) => void;
}

export const MlaDashboard: React.FC<Props> = ({ onSelectComplaint }) => {
  const { user, t } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchDashboardData = () => {
    setIsLoading(true);

    const constId = user?.constituency_id || 'const-shivajinagar';

    Promise.all([
      api.getComplaints({ constituency_id: constId, limit: 100 }),
      api.getConstituencyById(constId),
      api.getAnalytics(constId),
    ])
      .then(([compRes, constRes, analRes]) => {
        if (compRes.success && compRes.data) setComplaints(compRes.data);
        if (constRes.success && constRes.constituency) setConstituency(constRes.constituency);
        if (analRes.success) setAnalytics(analRes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportCsv = async () => {
    const constId = user?.constituency_id || 'const-shivajinagar';
    setIsExporting(true);
    try {
      const blob = await api.exportComplaintsCsv({ constituency_id: constId });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `JanSankalp_Complaints_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export complaint report');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.complaint_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.location_address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resolvedComplaints = complaints.filter(c => c.status === 'resolved' || c.status === 'closed');
  const resolvedComplaintsWithDates = resolvedComplaints.filter(c => c.resolved_at);
  const ratedComplaints = complaints.filter(c => typeof c.citizen_rating === 'number');
  const fallbackResolutionRate = complaints.length ? Math.round((resolvedComplaints.length / complaints.length) * 1000) / 10 : 0;
  const fallbackSlaRate = resolvedComplaints.length
    ? Math.round((resolvedComplaints.filter(c => c.is_sla_breached === 0).length / resolvedComplaints.length) * 1000) / 10
    : 0;
  const fallbackResolutionHours = resolvedComplaintsWithDates.length
    ? Math.round(resolvedComplaintsWithDates.reduce((total, c) => total + (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / 3600000, 0) / resolvedComplaintsWithDates.length * 10) / 10
    : 0;
  const fallbackSatisfaction = ratedComplaints.length
    ? Math.round(ratedComplaints.reduce((total, c) => total + (c.citizen_rating || 0), 0) / ratedComplaints.length * 10) / 10
    : 0;

  const kpis: AnalyticsKpi = analytics?.kpis || {
    total: complaints.length,
    pendingTotal: complaints.filter(c => c.status === 'submitted' || c.status === 'verified').length,
    inProgressTotal: complaints.filter(c => c.status === 'in_progress').length,
    resolvedTotal: resolvedComplaints.length,
    reopenedTotal: complaints.filter(c => c.status === 'reopened').length,
    criticalActive: complaints.filter(c => c.priority === 'critical' && !['resolved', 'closed', 'rejected'].includes(c.status)).length,
    slaBreachedTotal: complaints.filter(c => c.is_sla_breached === 1).length,
    resolutionRate: fallbackResolutionRate,
    slaComplianceRate: fallbackSlaRate,
    avgResolutionHours: fallbackResolutionHours,
    citizenSatisfaction: fallbackSatisfaction,
    totalRatingsCount: ratedComplaints.length,
  };

  return (
    <div className="space-y-6">
      {/* Header with MLA Greeting & Export CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {t('constituencyCommand')}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {constituency?.name || 'Shivajinagar Assembly Constituency'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t('mlaDashboardTitle')}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {t('representative')}: <span className="font-bold text-slate-900">{constituency?.mla_name || 'Hon. Rajesh Shinde (MLA)'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>{t('printDossier')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isExporting ? 'Preparing CSV...' : 'Export Official CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip (SRS Section 63) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">{t('totalVolume')}</span>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{kpis.total}</p>
          <span className="text-[10px] text-slate-500 font-medium">{t('allLoggedGrievances')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 block">Resolution Rate</span>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{kpis.resolutionRate}%</p>
          <span className="text-[10px] text-slate-500 font-medium">Resolved vs Total</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 block">{t('slaCompliance')}</span>
          <p className="text-2xl font-black text-blue-600 mt-0.5">{kpis.slaComplianceRate}%</p>
          <span className="text-[10px] text-slate-500 font-medium">{t('withinTargetSla')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 block">{t('averageResolutionTime')}</span>
          <p className="text-2xl font-black text-purple-600 mt-0.5">{kpis.avgResolutionHours}h</p>
          <span className="text-[10px] text-slate-500 font-medium">{t('turnaroundDuration')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 block">{t('citizenRating')}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-2xl font-black text-amber-600">{kpis.citizenSatisfaction}</p>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{t('basedOnSurveys')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 block">{t('criticalAlerts')}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-2xl font-black text-red-600">{kpis.criticalActive}</p>
            <AlertOctagon className="w-5 h-5 text-red-600 animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{t('criticalHazards')}</span>
        </div>
      </div>

      {/* Interactive Constituency Map Section (SRS Section 24, 25) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {t('constituencyMapTitle')}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {t('geoTaggedComplaints')}: {complaints.length}
          </span>
        </div>

        <ConstituencyComplaintsMap
          complaints={complaints}
          boundaryGeoJson={constituency?.boundary}
          centerLat={constituency?.center_lat || 18.5314}
          centerLng={constituency?.center_lng || 73.8446}
          onSelectComplaint={onSelectComplaint}
          heightClass="h-[440px]"
        />
      </div>

      {/* Ward Breakdown Table (SRS Section 25, 34) */}
      {constituency?.wards && constituency.wards.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            {t('wardDistribution')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {constituency.wards.map(w => (
              <div
                key={w.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-blue-700 block">Ward #{w.ward_number}</span>
                  <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">{w.name}</h4>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Cases:</span>
                  <span className="font-extrabold text-slate-900">{w.complaint_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Complaints Table (SRS Section 26, 35) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">
            {t('complaintQueue')} ({filteredComplaints.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-56">
              <input
                type="text"
                placeholder={t('searchComplaints')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="all">{t('allPriorities')}</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t('complaintId')}</th>
                <th className="py-3 px-4">{t('titleCategory')}</th>
                <th className="py-3 px-4">{t('citizen')}</th>
                <th className="py-3 px-4">{t('departmentOfficer')}</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">{t('slaCountdown')}</th>
                <th className="py-3 px-4 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onSelectComplaint(c)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">
                    {c.complaint_number}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900 line-clamp-1">{c.title}</p>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {c.category_name} • {c.location_address}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{c.citizen_name}</span>
                    <span className="text-slate-400 text-[11px]">{c.citizen_mobile}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">
                      {c.department_name || 'Unassigned'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {c.assigned_officer_name || 'No officer assigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <SlaTimer
                      slaDueAt={c.sla_due_at}
                      isBreached={c.is_sla_breached}
                      status={c.status}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectComplaint(c);
                      }}
                      className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {t('manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Printable Dossier Modal (SRS Section 37) */}
      {showPrintModal && (
        <ExecutivePrintReportModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          constituency={constituency}
          kpis={kpis}
          complaints={complaints}
          departmentStats={analytics?.departmentStats || []}
          wardStats={analytics?.wardStats || []}
        />
      )}
    </div>
  );
};
