import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface AuthState {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * 세션 상태는 서버가 정답이다. 이 훅은 UX 편의(가드/네비게이션)를 위한 것일 뿐,
 * 실제 접근 제어는 항상 /api/admin/* 서버 미들웨어가 한다.
 */
export function useAuth(): AuthState {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .session()
      .then((res) => setUsername(res.username))
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const res = await api.login(name, password);
    setUsername(res.username);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUsername(null);
    }
  }, []);

  return { username, loading, login, logout };
}
