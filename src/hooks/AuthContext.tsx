import { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type AuthState } from './useAuth';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
