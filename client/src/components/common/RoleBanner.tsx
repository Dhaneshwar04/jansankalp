import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, Award, Briefcase, UserCheck } from 'lucide-react';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const RoleBanner: React.FC<Props> = ({ activeView, setActiveView }) => {
  const { user, role, switchDemoPersona, demoUsers, t } = useAuth();

  const personas = [
    {
      role: 'citizen',
      label: t('citizenRole'),
      name: 'Ramesh Sharma',
      email: 'citizen@jansankalp.gov.in',
      password: 'Jansankalp@1',
      icon: <User className="w-3.5 h-3.5" />,
      defaultView: 'citizen',
      color: 'bg-emerald-600',
    },
    {
      role: 'mla',
      label: 'MLA',
      name: 'Hon. Rajesh Shinde',
      email: 'mla@jansankalp.gov.in',
      password: 'Jansankalp@2',
      icon: <Award className="w-3.5 h-3.5" />,
      defaultView: 'mla',
      color: 'bg-blue-600',
    },
    {
      role: 'staff',
      label: t('staffRole'),
      name: 'Sunita Patil',
      email: 'staff@jansankalp.gov.in',
      password: 'Jansankalp@3',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      defaultView: 'mla',
      color: 'bg-purple-600',
    },
    {
      role: 'officer',
      label: t('officerRole'),
      name: 'Er. Vikrant Deshmukh (PWD)',
      email: 'officer@jansankalp.gov.in',
      password: 'Jansankalp@4',
      icon: <Briefcase className="w-3.5 h-3.5" />,
      defaultView: 'officer',
      color: 'bg-amber-600',
    },
    {
      role: 'superadmin',
      label: t('adminRole'),
      name: 'Super Admin',
      email: 'admin@jansankalp.gov.in',
      password: 'Jansankalp@5',
      icon: <Shield className="w-3.5 h-3.5" />,
      defaultView: 'admin',
      color: 'bg-slate-800',
    },
  ];

  return (
    <div className="bg-slate-900 text-white text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider text-[11px]">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          {t('activePersona')}
        </span>
        <span className="font-bold text-slate-100">{user?.name || 'Guest Resident'}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
          {role}
        </span>
      </div>

      {/* Fast 1-Click Role Switcher */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">{t('switchDemoPersona')}</span>
        {personas.map(p => {
          const isActive = role === p.role;
          return (
            <button
              key={p.role}
              type="button"
              title={`${p.name} | ${p.email} | Password: ${p.password}`}
              onClick={async () => {
                await switchDemoPersona(p.email, p.password);
                setActiveView(p.defaultView);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? `${p.color} text-white shadow-xs ring-2 ring-white/30 scale-105`
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
              <span className="text-[9px] opacity-75 font-mono hidden md:inline">({p.password})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
