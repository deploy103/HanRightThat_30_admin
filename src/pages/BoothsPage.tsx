import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { formatWon } from '../lib/format';
import type { Booth, BoothInput, FloorId } from '../types';

const EMPTY_FORM: BoothInput = {
  name: '',
  team: '',
  floor: 2,
  amount: 0,
  place: '',
  position: { x: 50, y: 50 },
  isActive: true,
  isPublic: true,
};

export function BoothsPage() {
  const [booths, setBooths] = useState<Booth[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BoothInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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
      isActive: booth.isActive,
      isPublic: booth.isPublic,
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

  async function handleArchive(id: string) {
    if (!window.confirm('이 부스를 보관하시겠습니까? 공개 화면에서 즉시 사라집니다.')) return;
    try {
      await api.archiveBooth(id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '보관하지 못했습니다.');
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
                onChange={(event) => setForm((f) => ({ ...f, place: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="booth-x">위치 X (0~100)</label>
              <input
                id="booth-x"
                type="number"
                min={0}
                max={100}
                value={form.position.x}
                onChange={(event) =>
                  setForm((f) => ({ ...f, position: { ...f.position, x: Number(event.target.value) } }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="booth-y">위치 Y (0~100)</label>
              <input
                id="booth-y"
                type="number"
                min={0}
                max={100}
                value={form.position.y}
                onChange={(event) =>
                  setForm((f) => ({ ...f, position: { ...f.position, y: Number(event.target.value) } }))
                }
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
                    {booth.archivedAt ? (
                      <button type="button" className="btn btn-sm" onClick={() => handleRestore(booth.id)}>
                        복원
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => handleArchive(booth.id)}>
                        보관
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
