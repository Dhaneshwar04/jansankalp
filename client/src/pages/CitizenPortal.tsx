import React, { useState, useEffect } from 'react';
import { Complaint } from '../types';
import { ComplaintCard } from '../components/complaints/ComplaintCard';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building,
  Sparkles,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface Props {
  onOpenCreateComplaint: () => void;
  onSelectComplaint: (complaint: Complaint) => void;
}

export const CitizenPortal: React.FC<Props> = ({
  onOpenCreateComplaint,
  onSelectComplaint,
}) => {
  const { user, t } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);

  const fetchComplaints = () => {
    setIsLoading(true);

    const params: Record<string, any> = {
      search: searchTerm || undefined,
      category_id: selectedCategory || undefined,
      scope: user?.role === 'citizen' ? 'own' : undefined,
    };

    if (activeTab === 'pending') {
      params.status = 'submitted';
    } else if (activeTab === 'in_progress') {
      params.status = 'in_progress';
    } else if (activeTab === 'resolved') {
      params.status = 'resolved';
    } else if (activeTab === 'closed') {
      params.status = 'closed';
    }

    api
      .getComplaints(params)
      .then((res) => {
        if (res.success && res.data) {
          setComplaints(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [activeTab, selectedCategory]);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => {
        if (res.success) {
          setCategories(res.categories);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  const totalCount = complaints.length;

  const inProgressCount = complaints.filter(
    (c) =>
      c.status === 'in_progress' ||
      c.status === 'assigned'
  ).length;

  const resolvedCount = complaints.filter(
    (c) =>
      c.status === 'resolved' ||
      c.status === 'closed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Citizen Hero & Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-semibold border border-white/10">
            <MapPin className="w-3.5 h-3.5 text-blue-300" />
            <span>{t('constituencyName')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {t('citizenHeroTitle')}
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            {t('citizenHeroDescription')}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenCreateComplaint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>{t('fileNewGrievance')}</span>
            </button>

            <div className="text-xs text-blue-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('averageSla')}</span>
            </div>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Grievances */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">
              {t('totalGrievances')}
            </span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>

          <p className="text-2xl font-extrabold text-slate-900">
            {totalCount}
          </p>

          <span className="text-[11px] text-slate-500 font-medium">
            {t('loggedInConstituency')}
          </span>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">
              {t('inProgressMetric')}
            </span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>

          <p className="text-2xl font-extrabold text-amber-600">
            {inProgressCount}
          </p>

          <span className="text-[11px] text-slate-500 font-medium">
            {t('underActiveWork')}
          </span>
        </div>

        {/* Resolved & Closed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">
              {t('resolvedAndClosed')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>

          <p className="text-2xl font-extrabold text-emerald-600">
            {resolvedCount}
          </p>

          <span className="text-[11px] text-slate-500 font-medium">
            {t('successfullyCompleted')}
          </span>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">
              {t('resolutionRate')}
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>

          <p className="text-2xl font-extrabold text-indigo-600">
            {totalCount > 0
              ? Math.round((resolvedCount / totalCount) * 100)
              : 0}
            %
          </p>

          <span className="text-[11px] text-slate-500 font-medium">
            {t('constituencyPerformance')}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              {
                id: 'all',
                label: t('allGrievances'),
              },
              {
                id: 'pending',
                label: t('pendingReview'),
              },
              {
                id: 'in_progress',
                label: t('inProgress'),
              },
              {
                id: 'resolved',
                label: t('resolved'),
              },
              {
                id: 'closed',
                label: t('closed'),
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Category Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {t('allCategories')}
              </option>

              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code === 'DRAIN'
                    ? t('categoryDrainage')
                    : c.code === 'ELEC'
                    ? t('categoryElectricity')
                    : c.code === 'SWM'
                    ? t('categoryGarbage')
                    : c.code === 'AMENITIES'
                    ? t('categoryParks')
                    : c.code === 'ROADS'
                    ? t('categoryRoads')
                    : c.code === 'WATER'
                    ? t('categoryWater')
                    : c.name}
                </option>
              ))}
            </select>

            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 md:w-64"
            >
              <input
                type="text"
                placeholder={t('complaintSearch')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>
          </div>
        </div>
      </div>

      {/* Grievances Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading grievances...
        </div>
      ) : complaints.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complaints.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              onClick={onSelectComplaint}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-bold text-slate-900">
            {t('noGrievances')}
          </h3>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t('noGrievancesDescription')}
          </p>

          <button
            type="button"
            onClick={onOpenCreateComplaint}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-md"
          >
            {t('fileNew')}
          </button>
        </div>
      )}
    </div>
  );
};