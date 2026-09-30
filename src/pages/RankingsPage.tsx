import { useEffect, useState } from 'react';
import { AmountInput } from '../components/AmountInput';
import { api, ApiError } from '../lib/api';
import { formatUpdatedLabel, formatWon } from '../lib/format';
import type { FestivalMeta, RankedBooth } from '../types';

const TIER_LABEL: Record<string, string> = { gold: '1위', silver: '2위', bronze: '3위', normal: '' };

export function RankingsPage() {
  const [rankings, setRankings] = useState<RankedBooth[] | null>(null);
  const [rankingsPublic, setRankingsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<FestivalMeta | null>(null);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);

  async function load() {
    try {
      const [res, currentMeta] = await Promise.all([api.getRankings(), api.getMeta()]);
      setRankings(res.rankings);
      setRankingsPublic(res.rankingsPublic);
      setMeta(currentMeta);
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

  /** 공개 화면의 "갱신" 문구·목표 모금액·공연 장소 (FestivalData.meta) 를 저장한다. */
  async function saveMeta(event: React.FormEvent) {
    event.preventDefault();
    if (!meta) return;
    setMetaSaving(true);
    setMetaSaved(false);
    setError(null);
    try {
      const saved = await api.updateMeta(meta);
      setMeta(saved.meta);
      setMetaSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '기본 정보를 저장하지 못했습니다.');
    } finally {
      setMetaSaving(false);
    }
  }

  const editMeta = (patch: Partial<FestivalMeta>) => {
    setMetaSaved(false);
    setMeta((current) => (current ? { ...current, ...patch } : current));
  };

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

      {meta ? (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={(event) => void saveMeta(event)}>
          <h3 style={{ marginBottom: 12 }}>공개 화면 기본 정보</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="meta-updated">순위 갱신 문구</label>
              <div className="actions-row">
                <input
                  id="meta-updated"
                  value={meta.updated}
                  onChange={(event) => editMeta({ updated: event.target.value })}
                  placeholder="예: 10월 1일 오후 3시 기준"
                  maxLength={40}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="button" className="btn btn-sm" onClick={() => editMeta({ updated: formatUpdatedLabel(new Date()) })}>
                  지금 시각으로
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="meta-goal">목표 모금액 (원)</label>
              <AmountInput id="meta-goal" value={meta.goal} onChange={(goal) => editMeta({ goal })} />
            </div>
            <div className="field">
              <label htmlFor="meta-stage">공연 장소</label>
              <input
                id="meta-stage"
                value={meta.stage}
                onChange={(event) => editMeta({ stage: event.target.value })}
                placeholder="예: 대강당"
                maxLength={30}
              />
            </div>
          </div>
          <p className="field-hint">
            갱신 문구는 공개 화면의 순위 제목 옆과 상단 &quot;갱신&quot; 칸에 그대로 표시됩니다. 목표 모금액이 0이면 목표
            대신 부스 합계만 보여 줍니다.
          </p>
          <div className="actions-row">
            <button type="submit" className="btn btn-primary" disabled={metaSaving}>
              {metaSaving ? '저장 중…' : '저장'}
            </button>
            {metaSaved ? <span style={{ color: 'var(--acid)', fontSize: 13 }}>저장했습니다.</span> : null}
          </div>
        </form>
      ) : null}

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
