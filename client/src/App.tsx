import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { RoleBanner } from './components/common/RoleBanner';
import { CitizenPortal } from './pages/CitizenPortal';
import { MlaDashboard } from './pages/MlaDashboard';
import { OfficerPortal } from './pages/OfficerPortal';
import { AdminPortal } from './pages/AdminPortal';
import { PublicTransparencyPortal } from './pages/PublicTransparencyPortal';
import { CreateComplaintModal } from './components/complaints/CreateComplaintModal';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal';
import { AuthModal } from './pages/AuthModal';
import { Complaint } from './types';
import { CheckCircle2, Shield, PhoneCall, Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { role, user, t } = useAuth();
  const [activeView, setActiveView] = useState<string>('citizen');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [complaintRefreshKey, setComplaintRefreshKey] = useState<number>(0);

  const refreshComplaintViews = () => setComplaintRefreshKey(value => value + 1);

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const openCreateComplaint = () => {
    if (!user) {
      openAuth('login');
      return;
    }
    setIsCreateOpen(true);
  };

  const handleComplaintCreated = (complaintNumber: string) => {
    refreshComplaintViews();
    setSuccessToast(`${t('submitSuccess')} (${complaintNumber})`);
    setTimeout(() => setSuccessToast(null), 8000);
  };

  const handleSelectComplaint = (complaint: Complaint) => {
    setSelectedComplaintId(complaint.id);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* 1. Quick Persona Switcher Banner */}
      <RoleBanner activeView={activeView} setActiveView={setActiveView} />

      {/* 2. Top Header Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCreateComplaint={openCreateComplaint}
        onOpenAuth={() => openAuth('login')}
      />

      {/* Success Notification Banner */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-lg flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-100 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Workspace Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'citizen' && (
          user ? (
            <CitizenPortal
              key={complaintRefreshKey}
              onOpenCreateComplaint={openCreateComplaint}
              onSelectComplaint={handleSelectComplaint}
            />
          ) : (
            <section className="mx-auto max-w-3xl border-l-4 border-blue-600 bg-white px-6 py-10 shadow-sm sm:px-10">
              <p className="text-xs font-bold uppercase text-blue-700">{t('citizenServices')}</p>
              <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{t('guestHeadline')}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                {t('guestDescription')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                >
                  {t('createCitizenAccount')}
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t('signInAction')}
                </button>
              </div>
            </section>
          )
        )}

        {activeView === 'mla' && (
          <MlaDashboard key={complaintRefreshKey} onSelectComplaint={handleSelectComplaint} />
        )}

        {activeView === 'officer' && (
          <OfficerPortal key={complaintRefreshKey} onSelectComplaint={handleSelectComplaint} />
        )}

        {activeView === 'admin' && <AdminPortal />}

        {activeView === 'transparency' && <PublicTransparencyPortal />}
      </main>

      {/* 4. Modals */}
      <CreateComplaintModal
        isOpen={isCreateOpen && Boolean(user)}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleComplaintCreated}
      />

      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        isOpen={!!selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdated={refreshComplaintViews}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />

      {/* 5. Citizen Welfare Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-black text-xs">
              JS
            </div>
            <span className="font-bold text-slate-800">JanSankalp</span>
            <span>• {t('govLabel')}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" /> Helpline: 1800-200-5555 (Toll Free)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> {t('geoSlaFooter')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
