import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuthContext } from './hooks/AuthContext';
import { NavigationGuardProvider } from './hooks/NavigationGuard';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BoothsPage } from './pages/BoothsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PerformancesPage } from './pages/PerformancesPage';
import { RankingsPage } from './pages/RankingsPage';
import { SchedulePage } from './pages/SchedulePage';

/**
 * 이 가드는 UX 편의용이다. 실제 인가는 항상 서버(HanRightThat_30 /api/admin/*)가 하고,
 * 세션이 없으면 API 가 401 을 반환하므로 프론트 가드를 우회해도 데이터에 접근할 수 없다.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { username, loading } = useAuthContext();
  if (loading) return <p className="empty">확인 중…</p>;
  if (!username) return <Navigate to="/login" replace />;
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
          <Route path="/*" element={<AdminRoutes />} />
        </Routes>
      </NavigationGuardProvider>
    </AuthProvider>
  );
}
