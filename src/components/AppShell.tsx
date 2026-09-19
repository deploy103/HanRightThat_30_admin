import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '../hooks/AuthContext';
import { useNavigationGuard } from '../hooks/NavigationGuard';

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: '대시보드', end: true },
  { to: '/landing', label: '소개 페이지' },
  { to: '/booths', label: '부스 관리' },
  { to: '/booth-map', label: '부스 배치도' },
  { to: '/performances', label: '공연 순서' },
  { to: '/schedule', label: '축제 일정' },
  { to: '/announcements', label: '공지' },
  { to: '/rankings', label: '순위' },
  { to: '/audit-logs', label: '감사로그' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { username, logout } = useAuthContext();
  const { confirmLeave } = useNavigationGuard();

  function guardedClick(event: React.MouseEvent) {
    if (!confirmLeave()) {
      event.preventDefault();
      return;
    }
    setOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">한빛제 관리자</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={guardedClick}
          >
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              if (!confirmLeave()) return;
              void logout();
            }}
          >
            {username} 로그아웃
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <button
            type="button"
            className="topbar-menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-label="메뉴 열기"
          >
            ☰
          </button>
          <strong>한빛제 관리자</strong>
          <span style={{ width: 32 }} />
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
