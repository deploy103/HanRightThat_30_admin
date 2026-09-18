import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface NavigationGuardState {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** 저장하지 않은 변경이 있으면 확인창을 띄운다. true를 반환해야 실제 이동을 진행한다. */
  confirmLeave: () => boolean;
}

const Ctx = createContext<NavigationGuardState | null>(null);

/**
 * 이 앱은 일반 <Routes>(react-router의 data router가 아님)만 쓰기 때문에 라우터 차원의
 * 네비게이션 블로킹 훅(useBlocker 등)이 없다. 그래서 새로고침/닫기는 beforeunload로,
 * 사이드바·로그아웃 같은 SPA 내부 이동은 각 클릭 핸들러에서 confirmLeave()를 직접 호출해 막는다.
 */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    if (!dirty) return true;
    return window.confirm('저장하지 않은 변경 사항이 있습니다. 이 내용을 버리고 이동하시겠습니까?');
  }, [dirty]);

  return <Ctx.Provider value={{ dirty, setDirty, confirmLeave }}>{children}</Ctx.Provider>;
}

export function useNavigationGuard(): NavigationGuardState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('NavigationGuardProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
