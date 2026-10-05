import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { Language, translations } from '../locales/translations';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  isLoading: boolean;
  demoUsers: any[];
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  switchDemoPersona: (email: string, password?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('jansankalp_token'));
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('jansankalp_lang') as Language) || 'en'
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('jansankalp_lang', lang);
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const refreshUser = async () => {
    if (!localStorage.getItem('jansankalp_token')) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setUnreadCount(res.unreadNotifications || 0);
      }
    } catch {
      localStorage.removeItem('jansankalp_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUnreadCount = async () => {
    if (!localStorage.getItem('jansankalp_token')) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getNotifications();
      if (res.success) setUnreadCount(res.unreadCount || 0);
    } catch {
      // Keep the last known unread count when notifications are temporarily unavailable.
    }
  };

  useEffect(() => {
    refreshUser();
    // Fetch demo users for fast persona switcher
    api.getDemoUsers()
      .then(res => {
        if (res.success) setDemoUsers(res.demoUsers);
      })
      .catch(() => {});
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    if (res.success && res.token) {
      localStorage.setItem('jansankalp_token', res.token);
      setToken(res.token);
      setUser(res.user);
      await refreshUser();
    }
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    if (res.success && res.token) {
      localStorage.setItem('jansankalp_token', res.token);
      setToken(res.token);
      setUser(res.user);
      await refreshUser();
    }
  };

  const logout = () => {
    localStorage.removeItem('jansankalp_token');
    setToken(null);
    setUser(null);
    setUnreadCount(0);
  };

  const switchDemoPersona = async (email: string, customPassword?: string) => {
    setIsLoading(true);
    try {
      const passwordMap: Record<string, string> = {
        'citizen@jansankalp.gov.in': 'Jansankalp@1',
        'mla@jansankalp.gov.in': 'Jansankalp@2',
        'staff@jansankalp.gov.in': 'Jansankalp@3',
        'officer@jansankalp.gov.in': 'Jansankalp@4',
        'admin@jansankalp.gov.in': 'Jansankalp@5',
      };
      const pwd = customPassword || passwordMap[email] || 'Jansankalp@1';
      await login(email, pwd);
    } finally {
      setIsLoading(false);
    }
  };

  const role: UserRole = user?.role || 'citizen';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        language,
        setLanguage,
        t,
        unreadCount,
        refreshUnreadCount,
        isLoading,
        demoUsers,
        login,
        register,
        logout,
        switchDemoPersona,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
