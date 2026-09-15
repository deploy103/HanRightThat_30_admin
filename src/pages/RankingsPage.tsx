import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatWon } from '../lib/format';
import type { RankedBooth } from '../types';

const TIER_LABEL: Record<string, string> = { gold: '1위', silver: '2위', bronze: '3위', normal: '' };

export function RankingsPage() {
  const [rankings, setRankings] = useState<RankedBooth[] | null>(null);
  const [rankingsPublic, setRankingsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.getRankings();
      setRankings(res.rankings);
      setRankingsPublic(res.rankingsPublic);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '순위를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleVisibility() {
    setSaving(true);
    setError(null);
    try {
      await api.updateSettings({ rankingsPublic: !rankingsPublic });
      setRankingsPublic((value) => !value);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '변경하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>순위</h1>
        <button type="button" className="btn btn-primary" onClick={() => void toggleVisibility()} disabled={saving}>
          {rankingsPublic ? '순위 비공개로 전환' : '순위 공개로 전환'}
        </button>
      </div>
      <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: -12, marginBottom: 20 }}>
        순위는 모금액 기준으로 서버가 자동 계산합니다. 아래는 부스 금액을 반영한 현재 상태 미리보기이며, 공개
        여부와 무관하게 항상 표시됩니다. 현재 공개 화면 노출 상태:{' '}
        <strong style={{ color: rankingsPublic ? 'var(--acid)' : 'var(--hot)' }}>
          {rankingsPublic ? '공개' : '비공개'}
        </strong>
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      {rankings === null ? (
        <p className="empty">불러오는 중…</p>
      ) : rankings.length === 0 ? (
        <p className="empty">등록된(공개) 부스가 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>부스명</th>
              <th>팀</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((entry) => (
              <tr key={entry.booth.id}>
                <td data-label="순위">
                  {String(entry.rank).padStart(2, '0')} {TIER_LABEL[entry.tier]}
                </td>
                <td data-label="부스명">
                  <strong>{entry.booth.name}</strong>
                </td>
                <td data-label="팀">{entry.booth.team}</td>
                <td data-label="금액">{formatWon(entry.booth.amount)}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
