import React, { useState, useEffect } from 'react';
import { User, UserRole, SlaSetting, AuditLog } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  Clock,
  FileText,
  Building,
  FolderTree,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { t } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'sla' | 'audit' | 'departments'>('users');

  // Users Tab State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [newUser, setNewUser] = useState({
    name: '', email: '', mobile: '', password: '', role: 'officer' as UserRole,
    constituency_id: '', department_id: '', designation: '',
  });
  const [constituencies, setConstituencies] = useState<any[]>([]);

  // SLA Tab State
  const [slaSettings, setSlaSettings] = useState<SlaSetting[]>([]);
  const [isSavingSla, setIsSavingSla] = useState<boolean>(false);
  const [slaMessage, setSlaMessage] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('');
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Departments State
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDepartment, setNewDepartment] = useState({
    name: '', code: '', description: '', contact_email: '', contact_phone: '',
  });

  // Fetch Users
  const fetchUsers = () => {
    setIsLoadingUsers(true);
    api.getUsers({
      role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
      search: userSearch || undefined,
      limit: 100,
    })
      .then(res => {
        if (res.success && res.users) setUsersList(res.users);
      })
      .catch(console.error)
      .finally(() => setIsLoadingUsers(false));
  };

  // Fetch SLA Settings
  const fetchSla = () => {
    api.getSlaSettings()
      .then(res => {
        if (res.success && res.settings) setSlaSettings(res.settings);
      })
      .catch(console.error);
  };

  // Fetch Audit Logs
  const fetchAudit = () => {
    setIsLoadingAudit(true);
    api.getAuditLogs({ entity: auditEntityFilter || undefined, limit: 50 })
      .then(res => {
        if (res.success && res.logs) setAuditLogs(res.logs);
      })
      .catch(console.error)
      .finally(() => setIsLoadingAudit(false));
  };

  // Fetch Departments
  const fetchDepartments = () => {
    api.getDepartments()
      .then(res => {
        if (res.success && res.departments) setDepartments(res.departments);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      api.getDepartments().then(res => {
        if (res.success && res.departments) setDepartments(res.departments);
      }).catch(console.error);
      api.getConstituencies().then(res => {
        if (res.success && res.constituencies) setConstituencies(res.constituencies);
      }).catch(console.error);
    }
    if (activeTab === 'sla') fetchSla();
    if (activeTab === 'audit') fetchAudit();
    if (activeTab === 'departments') fetchDepartments();
  }, [activeTab, userRoleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setNewUser({ name: '', email: '', mobile: '', password: '', role: 'officer', constituency_id: '', department_id: '', designation: '' });
      fetchUsers();
      alert('User account created successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleSaveRole = async (targetUser: User) => {
    const role = roleDrafts[targetUser.id];
    if (!role || role === targetUser.role) return;
    try {
      await api.updateUserStatus(targetUser.id, undefined, role);
      setRoleDrafts(prev => ({ ...prev, [targetUser.id]: role }));
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDepartment(newDepartment);
      setNewDepartment({ name: '', code: '', description: '', contact_email: '', contact_phone: '' });
      fetchDepartments();
      alert('Department created successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  };

  // Handle User Status Toggle
  const handleToggleUserStatus = async (targetUser: User) => {
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUserStatus(targetUser.id, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  // Save SLA Settings
  const handleSaveSla = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSla(true);
    setSlaMessage(null);
    try {
      await api.updateSlaSettings(slaSettings);
      setSlaMessage('SLA settings saved successfully!');
    } catch (err: any) {
      setSlaMessage('Error saving SLA rules: ' + err.message);
    } finally {
      setIsSavingSla(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
              {t('adminPanel')}
            </span>
            <span className="text-xs text-slate-400 font-medium">Mantralaya Central IT Unit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
            {t('adminPortalTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('adminPortalDescription')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300">{t('systemHealthy')}</span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'users', label: t('userDirectory'), icon: <Users className="w-4 h-4" /> },
          { id: 'sla', label: t('slaMatrix'), icon: <Clock className="w-4 h-4" /> },
          { id: 'departments', label: t('departmentsAgencies'), icon: <Building className="w-4 h-4" /> },
          { id: 'audit', label: t('auditTrail'), icon: <FileText className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Users Tab (SRS Section 32) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              {t('registeredUsers')} ({usersList.length})
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="all">{t('allRoles')}</option>
                <option value="citizen">{t('citizens')}</option>
                <option value="mla">{t('mlas')}</option>
                <option value="staff">{t('staffMembers')}</option>
                <option value="officer">{t('departmentOfficers')}</option>
                <option value="superadmin">{t('administrators')}</option>
              </select>

              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder={t('searchUsers')}
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-slate-200 bg-white">
            <input required placeholder="Full name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2" />
            <input required type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2" />
            <input required type="tel" placeholder="Mobile number" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2" />
            <input required type="password" minLength={8} placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2" />
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2">
              <option value="citizen">Citizen</option><option value="mla">MLA</option><option value="staff">Staff</option><option value="officer">Officer</option><option value="superadmin">Administrator</option>
            </select>
            <select value={newUser.constituency_id} onChange={e => setNewUser({ ...newUser, constituency_id: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2">
              <option value="">No constituency</option>{constituencies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={newUser.department_id} onChange={e => setNewUser({ ...newUser, department_id: e.target.value })} className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2">
              <option value="">No department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input placeholder="Designation" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} className="min-w-0 flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2" />
              <button type="submit" className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">{t('createUser')}</button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{t('nameTitle')}</th>
                  <th className="py-3 px-4">{t('contactInfo')}</th>
                  <th className="py-3 px-4">{t('roleLabel')}</th>
                  <th className="py-3 px-4">{t('constituencyDepartment')}</th>
                  <th className="py-3 px-4">{t('accountStatus')}</th>
                  <th className="py-3 px-4 text-right">{t('moderation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.name}
                      {u.designation && (
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {u.designation}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="block text-slate-800">{u.email}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{u.mobile}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <select value={roleDrafts[u.id] || u.role} onChange={e => setRoleDrafts(prev => ({ ...prev, [u.id]: e.target.value as UserRole }))} className="text-[10px] font-bold uppercase bg-white border border-slate-300 rounded px-2 py-1">
                          <option value="citizen">Citizen</option><option value="mla">MLA</option><option value="staff">Staff</option><option value="officer">Officer</option><option value="superadmin">Administrator</option>
                        </select>
                        {roleDrafts[u.id] && roleDrafts[u.id] !== u.role && (
                          <button type="button" onClick={() => handleSaveRole(u)} className="text-[10px] font-bold text-blue-700 hover:underline">Save</button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.constituency_name || u.department_name || 'Central Service'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          u.status === 'active'
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-red-700 bg-red-50 border border-red-200'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'superadmin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                            u.status === 'active'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SLA Matrix Tab (SRS Section 28, 61) */}
      {activeTab === 'sla' && (
        <form onSubmit={handleSaveSla} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Service Level Agreement (SLA) Matrix Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set statutory resolution timeframes and early warning triggers.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingSla}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSla ? 'Saving...' : 'Save Matrix'}</span>
            </button>
          </div>

          {slaMessage && (
            <div className="p-3 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200">
              {slaMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slaSettings.map((item, idx) => (
              <div
                key={item.priority}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm uppercase text-slate-900 tracking-wider">
                    {item.priority} Priority
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    Statutory Rule
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Target Resolution Time (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={item.resolution_target_hours}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setSlaSettings(prev =>
                        prev.map((s, i) => (i === idx ? { ...s, resolution_target_hours: val } : s))
                      );
                    }}
                    className="w-full text-sm font-bold p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <p className="text-xs text-slate-500 italic">{item.description}</p>
              </div>
            ))}
          </div>
        </form>
      )}

      {/* 3. Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateDepartment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <input required placeholder="Department name" value={newDepartment.name} onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })} className="text-xs border border-slate-300 rounded-lg px-3 py-2" />
            <input required placeholder="Code (e.g. PWD)" value={newDepartment.code} onChange={e => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })} className="text-xs border border-slate-300 rounded-lg px-3 py-2" />
            <input placeholder="Contact email" type="email" value={newDepartment.contact_email} onChange={e => setNewDepartment({ ...newDepartment, contact_email: e.target.value })} className="text-xs border border-slate-300 rounded-lg px-3 py-2" />
            <input placeholder="Contact phone" value={newDepartment.contact_phone} onChange={e => setNewDepartment({ ...newDepartment, contact_phone: e.target.value })} className="text-xs border border-slate-300 rounded-lg px-3 py-2" />
            <input placeholder="Description" value={newDepartment.description} onChange={e => setNewDepartment({ ...newDepartment, description: e.target.value })} className="text-xs border border-slate-300 rounded-lg px-3 py-2" />
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">{t('createDepartment')}</button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map(d => (
            <div key={d.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {d.code}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {d.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{d.description}</p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{t('activeGrievances')}: <strong>{d.active_complaints || 0}</strong></span>
                <span>{t('activeOfficers')}: <strong>{d.officer_count || 0}</strong></span>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* 4. Immutable Audit Logs Tab (SRS Section 39) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">
              Immutable System Audit Trail ({auditLogs.length})
            </h3>
            <button
              type="button"
              onClick={fetchAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">State Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.user_name || log.user_email || 'System Daemon'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {log.entity} #{log.entity_id?.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-600 max-w-xs truncate">
                      {log.new_value ? JSON.stringify(log.new_value) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
