import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatDateTime, formatWon } from '../lib/format';
import type { AuditLogEntry, Booth, FestivalSettings } from '../types';

export function DashboardPage() {
  const [booths, setBooths] = useState<Booth[] | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [settings, setSettings] = useState<FestivalSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getBooths(), api.getAuditLogs(5), api.getSettings()])
      .then(([boothList, auditLogs, festivalSettings]) => {
        setBooths(boothList);
        setLogs(auditLogs);
        setSettings(festivalSettings);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof ApiError ? cause.message : '데이터를 불러오지 못했습니다.');
      });
  }, []);

  const activeBooths = (booths ?? []).filter((booth) => !booth.archivedAt);
  const total = activeBooths.reduce((sum, booth) => sum + booth.amount, 0);

  return (
    <>
      <div className="page-head">
        <h1>대시보드</h1>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">총 모금액 (보관 제외)</div>
          <div className="stat-value">{formatWon(total)}원</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">운영 중인 부스</div>
          <div className="stat-value">{activeBooths.length}개</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">순위 공개 상태</div>
          <div className="stat-value">{settings ? (settings.rankingsPublic ? '공개' : '비공개') : '-'}</div>
        </div>
      </div>

      <div className="card">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>최근 감사로그</h2>
          <Link to="/audit-logs" className="btn btn-sm">
            전체 보기
          </Link>
        </div>
        {logs && logs.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>관리자</th>
                <th>액션</th>
                <th>대상</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="시각">{formatDateTime(log.timestamp)}</td>
                  <td data-label="관리자">{log.admin}</td>
                  <td data-label="액션">{log.action}</td>
                  <td data-label="대상">
                    {log.targetType} · {log.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">기록이 없습니다.</p>
        )}
      </div>
    </>
  );
}
