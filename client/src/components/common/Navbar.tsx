import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Language } from '../../locales/translations';
import { api } from '../../services/api';
import { Modal } from './Modal';
import {
  Bell,
  Globe,
  PlusCircle,
  LayoutDashboard,
  MapPin,
  CheckCircle,
  User,
  LogOut,
  Building2,
  ShieldCheck,
  Eye,
  FileCheck2,
} from 'lucide-react';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenCreateComplaint: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeView,
  setActiveView,
  onOpenCreateComplaint,
  onOpenAuth,
}) => {
  const { user, role, language, setLanguage, t, unreadCount, refreshUnreadCount, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (showNotifications && user) {
      api.getNotifications()
        .then(async res => {
          if (res.success) {
            setNotifications(res.notifications);
            await refreshUnreadCount();
          }
        })
        .catch(console.error);
    }
  }, [showNotifications, user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      await refreshUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      await refreshUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    {
      id: 'citizen',
      label: t('myComplaints'),
      icon: <FileCheck2 className="w-4 h-4" />,
      allowedRoles: ['citizen', 'mla', 'staff', 'officer', 'superadmin'],
    },
    {
      id: 'mla',
      label: t('mlaDashboard'),
      icon: <LayoutDashboard className="w-4 h-4" />,
      allowedRoles: ['mla', 'staff', 'superadmin'],
    },
    {
      id: 'officer',
      label: t('departmentDesk'),
      icon: <Building2 className="w-4 h-4" />,
      allowedRoles: ['officer', 'staff', 'mla', 'superadmin'],
    },
    {
      id: 'admin',
      label: t('adminPanel'),
      icon: <ShieldCheck className="w-4 h-4" />,
      allowedRoles: ['superadmin'],
    },
    {
      id: 'transparency',
      label: t('transparency'),
      icon: <Eye className="w-4 h-4" />,
      allowedRoles: ['citizen', 'mla', 'staff', 'officer', 'superadmin'],
    },
  ];

  const visibleNav = navItems.filter(item => item.allowedRoles.includes(role));
  const profileRole = role === 'citizen' ? t('citizenRole') : role === 'mla' ? t('mlaRole') : role === 'staff' ? t('staffRole') : role === 'officer' ? t('officerRole') : t('adminRole');
  const profileStatus = user?.status === 'active' ? t('activeStatus') : user?.status === 'suspended' ? t('suspendedStatus') : t('pendingStatus');
  const profileFields = user ? [
    { label: t('fullName'), value: user.name },
    { label: t('email'), value: user.email },
    { label: t('mobile'), value: user.mobile },
    { label: t('roleLabel'), value: profileRole },
    { label: t('constituencyLabel'), value: user.constituency_name },
    { label: t('departmentLabel'), value: user.department_name },
    { label: t('wardLabel'), value: user.ward_name },
    { label: t('designationLabel'), value: user.designation },
    { label: t('addressLabel'), value: user.address },
    { label: t('districtLabel'), value: user.district },
    { label: t('stateLabel'), value: user.state },
    { label: t('statusLabel'), value: profileStatus },
    { label: t('memberSince'), value: user.created_at ? new Date(user.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN') : undefined },
  ].filter(field => field.value) : [];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setActiveView('citizen')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-base tracking-tighter">JS</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                    JanSankalp
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {t('mlaPortal')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 pl-4">
              {visibleNav.map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
              {(['en', 'hi', 'mr'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    language === lang
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'मराठी'}
                </button>
              ))}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label={t('notifications')}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">{t('notifications')}</span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {t('markAllRead')}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs ${
                            n.is_read ? 'bg-white' : 'bg-blue-50/50'
                          }`}
                        >
                          <h5 className="font-bold text-slate-900 mb-0.5">{n.title}</h5>
                          <p className="text-slate-600 leading-tight">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!n.is_read && (
                            <button type="button" onClick={() => handleMarkRead(n.id)} className="mt-1 text-[10px] font-bold text-blue-700 hover:underline">
                              {t('markRead')}
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">{t('noNotifications')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA: File Grievance */}
            <button
              type="button"
              onClick={onOpenCreateComplaint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('fileGrievance')}</span>
            </button>

            {/* User Profile or Login */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  aria-label={`${t('viewProfile')}: ${user.name}`}
                  title={t('viewProfile')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>{t('profile')}</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  title={t('logout')}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        title={t('profile')}
        subtitle={t('profileSubtitle')}
        maxWidth="md"
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {profileFields.map(field => (
            <div key={field.label} className="min-w-0 border-b border-slate-100 pb-2">
              <dt className="text-[11px] font-semibold text-slate-500">{field.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </header>
  );
};
