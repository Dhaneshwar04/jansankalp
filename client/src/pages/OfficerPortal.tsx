import React, { useState, useEffect } from 'react';
import { Complaint } from '../types';
import { ComplaintCard } from '../components/complaints/ComplaintCard';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Building,
  UserCheck,
} from 'lucide-react';

interface Props {
  onSelectComplaint: (complaint: Complaint) => void;
}

export const OfficerPortal: React.FC<Props> = ({ onSelectComplaint }) => {
  const { user, t } = useAuth();
  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'resolved'>('all');

  const fetchTasks = () => {
    setIsLoading(true);
    api.getComplaints({
      department_id: user?.department_id || 'dept-pwd',
      assigned_to_me: 'true',
    })
      .then(res => {
        if (res.success && res.data) {
          setTasks(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'assigned') return t.status === 'assigned';
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'resolved') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {t('officerConsole')}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {user?.department_name || 'Public Works & Roads Department (PWD)'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t('fieldTasks')}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {t('officerInCharge')}:{' '}
            <span className="font-bold text-slate-900">{user?.name || 'Er. Vikrant Deshmukh'}</span>{' '}
            ({user?.designation || 'Executive Engineer'})
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTasks}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('refreshTasks')}</span>
        </button>
      </div>

      {/* Task Filters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'all', label: `${t('allTasks')} (${tasks.length})` },
          { id: 'assigned', label: `${t('assignedNew')} (${tasks.filter(t => t.status === 'assigned').length})` },
          { id: 'in_progress', label: `${t('inProgress')} (${tasks.filter(t => t.status === 'in_progress').length})` },
          { id: 'resolved', label: `${t('resolved')} (${tasks.filter(t => t.status === 'resolved' || t.status === 'closed').length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
          Loading assigned complaints...
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <ComplaintCard
              key={task.id}
              complaint={task}
              onClick={onSelectComplaint}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">{t('noPendingTasks')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {t('noPendingTasksDescription')}
          </p>
        </div>
      )}
    </div>
  );
};
