import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AuthNextStep, SessionInfo, SessionStage } from '../types';

export interface AuthState {
  username: string | null;
  /** 비밀번호까지만 통과했는지, 2FA 까지 끝났는지 */
  stage: SessionStage | null;
  /** 다음에 거쳐야 할 단계 (setup = 최초 등록, verify = 코드 입력) */
  next: AuthNextStep;
  /** 2FA 를 모두 마친 상태에서만 true */
  authenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<SessionInfo>;
  /** 2FA 성공 후 호출해 화면 상태를 정식 세션으로 올린다. */
  completeTwoFactor: (username: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: SessionInfo = { username: null, stage: null, twoFactorEnabled: false, next: null };

/**
 * 세션 상태는 서버가 정답이다. 이 훅은 UX 편의(가드/네비게이션)를 위한 것일 뿐,
 * 실제 접근 제어는 항상 /api/admin/* 서버 미들웨어가 한다 —
 * 2FA 를 마치지 않은 세션은 서버가 401 로 막으므로 이 상태를 조작해도 데이터에 닿을 수 없다.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<SessionInfo>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSession(await api.session());
    } catch {
      setSession(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (name: string, password: string) => {
    const result = await api.login(name, password);
    setSession(result);
    return result;
  }, []);

  const completeTwoFactor = useCallback((username: string) => {
    setSession({ username, stage: 'TWO_FACTOR_VERIFIED', twoFactorEnabled: true, next: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setSession(EMPTY);
    }
  }, []);

  return {
    username: session.username,
    stage: session.stage,
    next: session.next,
    authenticated: session.stage === 'TWO_FACTOR_VERIFIED',
    loading,
    login,
    completeTwoFactor,
    logout,
    refresh,
  };
}
