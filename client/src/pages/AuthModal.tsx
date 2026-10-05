import React, { useEffect, useState } from 'react';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, Phone, User, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register, t } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);

  // Form Fields
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [otp, setOtp] = useState<string>('123456');
  const [otpSent, setOtpSent] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(identifier, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await register({
        name,
        email,
        mobile,
        password,
        address: 'Shivajinagar Citizen Residence',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobile) return;
    setIsLoading(true);
    try {
      await api.sendOtp(mobile);
      setOtpSent(true);
      setOtp('123456');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.verifyOtp(mobile, otp);
      if (res.success && res.token) {
        localStorage.setItem('jansankalp_token', res.token);
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'login'
          ? t('signInTitle')
          : mode === 'register'
          ? t('registrationTitle')
          : t('otpLoginTitle')
      }
      subtitle={t('authSubtitle')}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Toggle Mode Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t('passwordLogin')}
          </button>
          <button
            type="button"
            onClick={() => setMode('otp')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'otp' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t('mobileOtp')}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            {t('registerTab')}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* 1. Password Login */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            {/* Quick Demo Autofill Pills */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t('quickAutofill')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { role: t('citizenRole'), id: 'citizen@jansankalp.gov.in', pwd: 'Jansankalp@1' },
                  { role: 'MLA', id: 'mla@jansankalp.gov.in', pwd: 'Jansankalp@2' },
                  { role: t('staffRole'), id: 'staff@jansankalp.gov.in', pwd: 'Jansankalp@3' },
                  { role: t('officerRole'), id: 'officer@jansankalp.gov.in', pwd: 'Jansankalp@4' },
                  { role: t('adminRole'), id: 'admin@jansankalp.gov.in', pwd: 'Jansankalp@5' },
                ].map(p => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => {
                      setIdentifier(p.id);
                      setPassword(p.pwd);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      identifier === p.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {p.role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('emailOrMobile')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="citizen@jansankalp.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">{t('password')}</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer mt-2"
            >
              {isLoading ? t('signingIn') : t('login')}
            </button>
          </form>
        )}

        {/* 2. Mobile OTP */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('registeredMobile')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                >
                  {t('sendOtp')}
                </button>
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('enterOtp')}
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !otpSent}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer mt-2"
            >
              {isLoading ? t('verifyingOtp') : t('verifyEnterPortal')}
            </button>
          </form>
        )}

        {/* 3. New Citizen Registration */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">{t('fullName')} *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ramesh Sharma"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">{t('email')} *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">{t('mobile')} *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">{t('password')} *</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer mt-2"
            >
              {isLoading ? t('creatingAccount') : t('completeRegistration')}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
