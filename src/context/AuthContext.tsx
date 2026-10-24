import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Establishment, UserRole, RegisterSchoolPayload } from '../types.ts';
import { api, getAuthToken, setAuthToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  establishment: Establishment | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSystemInitialized: boolean;
  login: (credentials: { username: string; password: string; establishmentCode?: string; establishmentId?: string }) => Promise<any>;
  logout: () => void;
  checkStatus: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  demoSwitchUser: (username: string, establishmentCode?: string, devKey?: string) => Promise<void>;
  switchEstablishment: (establishmentId: string) => Promise<void>;
  registerNewSchool: (payload: RegisterSchoolPayload) => Promise<void>;
  bootstrapDeveloper: (payload: { username: string; password: string; fullName: string; email?: string; phone?: string }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean>(true);

  const checkStatus = async (): Promise<boolean> => {
    try {
      const res = await api.getStatus();
      setIsSystemInitialized(res.initialized);
      // Ne définir l'établissement que si un utilisateur authentifié est déjà actif
      if (res.establishment && getAuthToken()) {
        setEstablishment(res.establishment);
      }
      return res.initialized;
    } catch (err) {
      console.error('Erreur vérification statut:', err);
      return false;
    }
  };

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setEstablishment(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      if (data.establishment) {
        setEstablishment(data.establishment);
      }
    } catch (err) {
      console.warn('Session expirée ou invalide, nettoyage complet.');
      setAuthToken(null);
      setUser(null);
      setEstablishment(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await checkStatus();
      await refreshUser();
    };
    init();
  }, []);

  const login = async (credentials: { username: string; password: string; establishmentCode?: string; establishmentId?: string }) => {
    const res = await api.login(credentials);
    // Si plusieurs établissements correspondent à ce compte, retourner la réponse pour sélection
    if (res.requireEstablishmentSelection) {
      return res;
    }
    setAuthToken(res.token);
    setUser(res.user);
    setEstablishment(res.establishment);
    return res;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setEstablishment(null);
  };

  const switchEstablishment = async (establishmentId: string) => {
    try {
      const res = await api.switchEstablishment(establishmentId);
      setAuthToken(res.token);
      setUser(res.user);
      setEstablishment(res.establishment);
    } catch (err: any) {
      console.error("Erreur lors du changement d'établissement:", err);
      throw err;
    }
  };

  const registerNewSchool = async (payload: RegisterSchoolPayload) => {
    try {
      const res = await api.registerSchool(payload);
      setAuthToken(res.token);
      setUser(res.user);
      setEstablishment(res.establishment);
      setIsSystemInitialized(true);
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement de l'école:", err);
      throw err;
    }
  };

  const bootstrapDeveloper = async (payload: { username: string; password: string; fullName: string; email?: string; phone?: string }) => {
    try {
      const res = await api.bootstrapDeveloper(payload);
      setAuthToken(res.token);
      setUser(res.user);
      setIsSystemInitialized(true);
      return res;
    } catch (err: any) {
      console.error('Erreur bootstrap développeur:', err);
      throw err;
    }
  };

  const demoSwitchUser = async (target: string, establishmentCode?: string, devKey?: string) => {
    try {
      const res = await api.demoSwitch({ username: target, establishmentCode, devKey });
      setAuthToken(res.token);
      setUser(res.user);
      setEstablishment(res.establishment);
      setIsSystemInitialized(true);
    } catch (err: any) {
      console.error('Erreur switch compte démo:', err);
      throw err;
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN_GENERAL') return true;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        establishment,
        isAuthenticated: !!user,
        isLoading,
        isSystemInitialized,
        login,
        logout,
        checkStatus,
        refreshUser,
        hasRole,
        demoSwitchUser,
        switchEstablishment,
        registerNewSchool,
        bootstrapDeveloper,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider');
  }
  return context;
};
