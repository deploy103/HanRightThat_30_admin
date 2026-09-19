import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BoothImageField } from '../components/BoothImageField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { API_URL, api, ApiError } from '../lib/api';
import { formatWon } from '../lib/format';
import type { Booth, BoothInput, FloorId } from '../types';

const EMPTY_FORM: BoothInput = {
  name: '',
  team: '',
  floor: 2,
  amount: 0,
  place: '',
  position: { x: 50, y: 50 },
  size: { w: 14, h: 10 },
  isActive: true,
  isPublic: true,
  summary: '',
  description: '',
  imagePath: '',
  imageAlt: '',
};

function publicBoothMapUrl(id: string): string {
  return `${API_URL}/play/map?booth=${encodeURIComponent(id)}`;
}

export function BoothsPage() {
  const [booths, setBooths] = useState<Booth[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BoothInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Booth | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBooths(await api.getBooths());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '부스를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(booth: Booth) {
    setEditingId(booth.id);
    setForm({
      name: booth.name,
      team: booth.team,
      floor: booth.floor,
      amount: booth.amount,
      place: booth.place ?? '',
      position: booth.position,
      size: booth.size,
      isActive: booth.isActive,
      isPublic: booth.isPublic,
      summary: booth.summary ?? '',
      description: booth.description ?? '',
      imagePath: booth.imagePath ?? '',
      imageAlt: booth.imageAlt ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) await api.updateBooth(editingId, form);
      else await api.createBooth(form);
      setShowForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '저장하지 못했습니다.');
    }
  }

  async function handleArchive() {
    if (!confirmArchive) return;
    setBusy(true);
    try {
      await api.archiveBooth(confirmArchive.id);
      setConfirmArchive(null);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '보관하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await api.restoreBooth(id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '복원하지 못했습니다.');
    }
  }

  const visibleBooths = (booths ?? []).filter((booth) => showArchived || !booth.archivedAt);

  return (
    <>
      <div className="page-head">
        <h1>부스 관리</h1>
        <div className="actions-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--dim)', fontSize: 13 }}>
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            보관된 부스 표시
          </label>
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            + 부스 추가
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {showForm ? (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 12 }}>{editingId ? '부스 수정' : '부스 추가'}</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="booth-name">부스명</label>
              <input
                id="booth-name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booth-team">팀/학급</label>
              <input
                id="booth-team"
                value={form.team}
                onChange={(event) => setForm((f) => ({ ...f, team: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booth-floor">층</label>
              <select
                id="booth-floor"
                value={form.floor}
                onChange={(event) => setForm((f) => ({ ...f, floor: Number(event.target.value) as FloorId }))}
              >
                <option value={2}>2층</option>
                <option value={3}>3층</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="booth-amount">모금액</label>
              <input
                id="booth-amount"
                type="number"
                min={0}
                value={form.amount}
                onChange={(event) => setForm((f) => ({ ...f, amount: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label htmlFor="booth-place">위치 설명</label>
              <input
                id="booth-place"
                value={form.place ?? ''}
                placeholder="예: 2층 지능형소프트웨어과 1-1 앞"
                onChange={(event) => setForm((f) => ({ ...f, place: event.target.value }))}
              />
            </div>
            <div className="field-checkbox">
              <input
                id="booth-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((f) => ({ ...f, isActive: event.target.checked }))}
              />
              <label htmlFor="booth-active">운영 중</label>
            </div>
            <div className="field-checkbox">
              <input
                id="booth-public"
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => setForm((f) => ({ ...f, isPublic: event.target.checked }))}
              />
              <label htmlFor="booth-public">공개</label>
            </div>
          </div>

          <p className="inline-note">
            지도에서의 위치와 크기는 숫자로 입력하지 않습니다 —{' '}
            <Link to="/booth-map">부스 배치도</Link> 화면에서 끌어서 지정하세요.
            {editingId ? null : ' 새로 만든 부스는 배치도 가운데에 놓입니다.'}
          </p>

          <h3 style={{ margin: '4px 0 12px', fontSize: 14, color: 'var(--dim)' }}>소개 페이지용 정보 (선택)</h3>
          <p style={{ margin: '-8px 0 12px', color: 'var(--dim)', fontSize: 12 }}>
            아래 항목은 소개 페이지(hanwol.site) 부스 미리보기에 쓰인다. 비워 두면 소개 페이지에서는 기본
            그래픽으로 대체된다.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="booth-summary">한 줄 소개 (최대 300자)</label>
              <input
                id="booth-summary"
                value={form.summary ?? ''}
                maxLength={300}
                onChange={(event) => setForm((f) => ({ ...f, summary: event.target.value }))}
              />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="booth-description">상세 설명 (최대 3000자)</label>
            <textarea
              id="booth-description"
              rows={3}
              value={form.description ?? ''}
              maxLength={3000}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </div>
          <BoothImageField
            imagePath={form.imagePath ?? ''}
            imageAlt={form.imageAlt ?? ''}
            altFallback={form.name}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          />

          <div className="actions-row">
            <button type="submit" className="btn btn-primary">
              저장
            </button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>
              취소
            </button>
          </div>
        </form>
      ) : null}

      {booths === null ? (
        <p className="empty">불러오는 중…</p>
      ) : visibleBooths.length === 0 ? (
        <p className="empty">등록된 부스가 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>부스명</th>
              <th>팀</th>
              <th>층</th>
              <th>금액</th>
              <th>상태</th>
              <th>공개</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {visibleBooths.map((booth) => (
              <tr key={booth.id} className={booth.archivedAt ? 'archived' : ''}>
                <td data-label="부스명">
                  <strong>{booth.name}</strong>
                </td>
                <td data-label="팀">{booth.team}</td>
                <td data-label="층">{booth.floor}층</td>
                <td data-label="금액">{formatWon(booth.amount)}원</td>
                <td data-label="상태">
                  <span className={`pill ${booth.isActive ? 'pill-on' : 'pill-off'}`}>
                    {booth.isActive ? '운영중' : '운영종료'}
                  </span>
                </td>
                <td data-label="공개">
                  <span className={`pill ${booth.isPublic ? 'pill-on' : 'pill-off'}`}>
                    {booth.isPublic ? '공개' : '비공개'}
                  </span>
                </td>
                <td data-label="관리">
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(booth)}>
                      수정
                    </button>
                    {booth.archivedAt ? null : (
                      <Link className="btn btn-sm" to="/booth-map">
                        배치도
                      </Link>
                    )}
                    {booth.archivedAt ? (
                      <button type="button" className="btn btn-sm" onClick={() => handleRestore(booth.id)}>
                        복원
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmArchive(booth)}>
                        보관
                      </button>
                    )}
                    {booth.isPublic && !booth.archivedAt ? (
                      <a
                        className="btn btn-sm"
                        href={publicBoothMapUrl(booth.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        공개 위치 보기
                      </a>
                    ) : (
                      <span className="pill pill-off" title="비공개·보관 부스는 공개 지도 링크로 확인할 수 없습니다.">
                        공개 링크 없음
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={confirmArchive !== null}
        title="이 부스를 보관할까요?"
        description={
          <>
            <b>{confirmArchive?.name}</b> 부스가 공개 화면(지도 · 부스 목록 · 순위)에서 즉시 사라집니다. 데이터는 남아
            있어 "보관된 부스 표시"에서 다시 복원할 수 있습니다.
          </>
        }
        confirmLabel="보관"
        danger
        busy={busy}
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchive(null)}
      />
    </>
  );
}
