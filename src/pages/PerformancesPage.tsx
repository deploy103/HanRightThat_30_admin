import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { Show, ShowInput } from '../types';

const EMPTY_FORM: ShowInput = { time: '13:00', team: '', title: '', genre: '', note: '' };

export function PerformancesPage() {
  const [shows, setShows] = useState<Show[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShowInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      setShows(await api.getPerformances());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '공연을 불러오지 못했습니다.');
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

  function startEdit(show: Show) {
    setEditingId(show.id);
    setForm({ time: show.time, team: show.team, title: show.title, genre: show.genre ?? '', note: show.note ?? '' });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) await api.updatePerformance(editingId, form);
      else await api.createPerformance(form);
      setShowForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '저장하지 못했습니다.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 공연을 삭제하시겠습니까?')) return;
    try {
      await api.deletePerformance(id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '삭제하지 못했습니다.');
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!shows) return;
    const target = index + direction;
    if (target < 0 || target >= shows.length) return;
    const ids = shows.map((show) => show.id);
    const tmp = ids[index];
    ids[index] = ids[target];
    ids[target] = tmp;
    try {
      setShows(await api.reorderPerformances(ids));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '순서를 바꾸지 못했습니다.');
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>공연 순서</h1>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          + 공연 추가
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {showForm ? (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 12 }}>{editingId ? '공연 수정' : '공연 추가'}</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="show-time">시간 (HH:MM)</label>
              <input
                id="show-time"
                value={form.time}
                onChange={(event) => setForm((f) => ({ ...f, time: event.target.value }))}
                placeholder="13:00"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="show-team">팀/학급</label>
              <input
                id="show-team"
                value={form.team}
                onChange={(event) => setForm((f) => ({ ...f, team: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="show-title">공연명</label>
              <input
                id="show-title"
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="show-genre">장르</label>
              <input
                id="show-genre"
                value={form.genre ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, genre: event.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="show-note">비고</label>
              <input
                id="show-note"
                value={form.note ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))}
              />
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

      {shows === null ? (
        <p className="empty">불러오는 중…</p>
      ) : shows.length === 0 ? (
        <p className="empty">등록된 공연이 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>순서</th>
              <th>시간</th>
              <th>팀</th>
              <th>공연명</th>
              <th>장르</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {shows.map((show, index) => (
              <tr key={show.id}>
                <td data-label="순서">{String(show.order).padStart(2, '0')}</td>
                <td data-label="시간">{show.time}</td>
                <td data-label="팀">{show.team}</td>
                <td data-label="공연명">{show.title}</td>
                <td data-label="장르">{show.genre ?? '-'}</td>
                <td data-label="관리">
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => move(index, -1)} disabled={index === 0}>
                      ▲
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === shows.length - 1}
                    >
                      ▼
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(show)}>
                      수정
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(show.id)}>
                      삭제
                    </button>
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
