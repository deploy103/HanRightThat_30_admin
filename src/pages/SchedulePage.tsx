import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import type { ScheduleItem, ScheduleItemInput } from '../types';

const EMPTY_FORM: ScheduleItemInput = { time: '12:30', title: '', note: '' };

export function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleItemInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      setItems(await api.getSchedule());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '일정을 불러오지 못했습니다.');
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

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setForm({ time: item.time, title: item.title, note: item.note ?? '' });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) await api.updateScheduleItem(editingId, form);
      else await api.createScheduleItem(form);
      setShowForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '저장하지 못했습니다.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await api.deleteScheduleItem(id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '삭제하지 못했습니다.');
    }
  }

  const sorted = [...(items ?? [])].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <div className="page-head">
        <h1>축제 일정</h1>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          + 일정 추가
        </button>
      </div>
      <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: -12, marginBottom: 20 }}>
        개회식/폐회식 등 축제 전체 진행 순서. 공연 순서(공연 관리 메뉴)와는 별도이며, 여기서 저장하면
        소개 페이지(<code>/</code>)의 "축제 전체 일정" 구역에 바로 반영됩니다.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      {showForm ? (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 12 }}>{editingId ? '일정 수정' : '일정 추가'}</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="schedule-time">시간 (HH:MM)</label>
              <input
                id="schedule-time"
                value={form.time}
                onChange={(event) => setForm((f) => ({ ...f, time: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="schedule-title">일정명</label>
              <input
                id="schedule-title"
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="schedule-note">비고</label>
              <input
                id="schedule-note"
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

      {items === null ? (
        <p className="empty">불러오는 중…</p>
      ) : sorted.length === 0 ? (
        <p className="empty">등록된 일정이 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>일정</th>
              <th>비고</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id}>
                <td data-label="시간">{item.time}</td>
                <td data-label="일정">{item.title}</td>
                <td data-label="비고">{item.note ?? '-'}</td>
                <td data-label="관리">
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => startEdit(item)}>
                      수정
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
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
