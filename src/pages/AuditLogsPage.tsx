import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { AuditLogEntry } from '../types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api
      .getAuditLogs(500)
      .then(setLogs)
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : '불러오지 못했습니다.'));
  }, []);

  const filtered = (logs ?? []).filter((log) => {
    if (!filter) return true;
    const haystack = `${log.action} ${log.admin} ${log.targetType} ${log.targetId}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });

  return (
    <>
      <div className="page-head">
        <h1>감사 로그</h1>
      </div>
      <div className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label htmlFor="log-filter">필터 (액션/관리자/대상)</label>
        <input id="log-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="예: booth_update" />
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {logs === null ? (
        <p className="empty">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="empty">기록이 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>관리자</th>
              <th>액션</th>
              <th>대상</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id}>
                <td data-label="시각">{formatDateTime(log.timestamp)}</td>
                <td data-label="관리자">{log.admin}</td>
                <td data-label="액션">{log.action}</td>
                <td data-label="대상">
                  {log.targetType} · {log.targetId}
                </td>
                <td data-label="IP">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
