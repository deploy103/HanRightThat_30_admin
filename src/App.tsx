import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuthContext } from './hooks/AuthContext';
import { NavigationGuardProvider } from './hooks/NavigationGuard';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BoothMapPage } from './pages/BoothMapPage';
import { BoothsPage } from './pages/BoothsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PerformancesPage } from './pages/PerformancesPage';
import { RankingsPage } from './pages/RankingsPage';
import { SchedulePage } from './pages/SchedulePage';
import { TwoFactorSetupPage } from './pages/TwoFactorSetupPage';
import { TwoFactorVerifyPage } from './pages/TwoFactorVerifyPage';

/**
 * 이 가드는 UX 편의용이다. 실제 인가는 항상 서버(HanRightThat_30 /api/admin/*)가 하고,
 * 2단계 인증을 마치지 않은 세션에는 API 가 401 을 반환하므로 프론트 가드를 우회해도
 * 데이터에 접근할 수 없다.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated, next, loading } = useAuthContext();
  if (loading) return <p className="empty">확인 중…</p>;
  // 비밀번호만 통과한 상태라면 관리자 화면 대신 남은 인증 단계로 보낸다.
  if (next === 'setup') return <Navigate to="/two-factor/setup" replace />;
  if (next === 'verify') return <Navigate to="/two-factor" replace />;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** 2FA 화면은 "비밀번호까지 통과한" 상태에서만 의미가 있다. */
function RequirePending({ step, children }: { step: 'setup' | 'verify'; children: ReactNode }) {
  const { authenticated, next, loading } = useAuthContext();
  if (loading) return <p className="empty">확인 중…</p>;
  if (authenticated) return <Navigate to="/" replace />;
  if (!next) return <Navigate to="/login" replace />;
  if (next !== step) return <Navigate to={next === 'setup' ? '/two-factor/setup' : '/two-factor'} replace />;
  return <>{children}</>;
}

function AdminRoutes() {
  return (
    <RequireAuth>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/booths" element={<BoothsPage />} />
          <Route path="/booth-map" element={<BoothMapPage />} />
          <Route path="/performances" element={<PerformancesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <NavigationGuardProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/two-factor"
            element={
              <RequirePending step="verify">
                <TwoFactorVerifyPage />
              </RequirePending>
            }
          />
          <Route
            path="/two-factor/setup"
            element={
              <RequirePending step="setup">
                <TwoFactorSetupPage />
              </RequirePending>
            }
          />
          <Route path="/*" element={<AdminRoutes />} />
        </Routes>
      </NavigationGuardProvider>
    </AuthProvider>
  );
}
