import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, api, ApiError } from '../lib/api';
import { formatDateTime, formatWon } from '../lib/format';
import type { AuditLogEntry, Booth, FestivalSettings, LandingState, TwoFactorStatus } from '../types';

export function DashboardPage() {
  const [booths, setBooths] = useState<Booth[] | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [settings, setSettings] = useState<FestivalSettings | null>(null);
  const [landing, setLanding] = useState<LandingState | null>(null);
  const [landingUnavailable, setLandingUnavailable] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null);
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

    // 소개 API는 서버 업데이트가 아직 안 된 환경에서는 404일 수 있다 — 그 경우 나머지 대시보드는 그대로 쓴다.
    api.getLanding().then(setLanding).catch(() => setLandingUnavailable(true));
    api.twoFactorStatus().then(setTwoFactor).catch(() => setTwoFactor(null));
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
        <div className="stat-card">
          <div className="stat-label">2단계 인증</div>
          <div className="stat-value">{twoFactor ? (twoFactor.enabled ? '사용 중' : '미설정') : '-'}</div>
          {twoFactor?.enabled ? (
            <div className="stat-sub">
              남은 복구 코드 {twoFactor.remainingRecoveryCodes}개
              {twoFactor.remainingRecoveryCodes <= 2 ? ' · 부족합니다' : ''}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16 }}>소개 페이지</h2>
          <Link to="/landing" className="btn btn-sm">
            소개 편집으로 이동
          </Link>
        </div>
        {landingUnavailable ? (
          <p className="empty">
            서버에 소개 API가 아직 없습니다. HanRightThat_30 서버를 최신 버전으로 배포한 뒤 다시 확인해 주세요.
          </p>
        ) : landing ? (
          <>
            <p style={{ margin: '0 0 6px', color: 'var(--dim)', fontSize: 13 }}>
              게시 여부{' '}
              <span className={`pill ${landing.published ? 'pill-on' : 'pill-off'}`}>
                {landing.published ? '게시됨' : '초안만 있음(미게시)'}
              </span>
            </p>
            <p style={{ margin: '0 0 14px', color: 'var(--dim)', fontSize: 13 }}>
              마지막 게시 시각 {landing.publishedAt ? formatDateTime(landing.publishedAt) : '게시된 적 없음'}
            </p>
            <div className="actions-row">
              <a className="btn btn-sm" href={`${API_URL}/`} target="_blank" rel="noreferrer">
                공개 소개 열기
              </a>
              <a className="btn btn-sm" href={`${API_URL}/play/map`} target="_blank" rel="noreferrer">
                현장 지도 열기
              </a>
            </div>
          </>
        ) : (
          <p className="empty">불러오는 중…</p>
        )}
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
