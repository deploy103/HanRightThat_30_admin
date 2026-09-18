import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { Announcement, AnnouncementInput } from '../types';

const EMPTY_FORM: AnnouncementInput = { title: '', body: '', isPublished: false };

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      setItems(await api.getAnnouncements());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '공지를 불러오지 못했습니다.');
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

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body, isPublished: item.isPublished });
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) await api.updateAnnouncement(editingId, form);
      else await api.createAnnouncement(form);
      setShowForm(false);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '저장하지 못했습니다.');
    }
  }

  async function togglePublish(item: Announcement) {
    try {
      await api.updateAnnouncement(item.id, {
        title: item.title,
        body: item.body,
        isPublished: !item.isPublished,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '변경하지 못했습니다.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
    try {
      await api.deleteAnnouncement(id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '삭제하지 못했습니다.');
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>공지 관리</h1>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          + 공지 추가
        </button>
      </div>
      <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: -12, marginBottom: 20 }}>
        게시된 공지만 소개 페이지(<code>/</code>)의 "공지" 구역에 노출됩니다. 게시 여부를 끄면 즉시 사라집니다.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      {showForm ? (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 12 }}>{editingId ? '공지 수정' : '공지 추가'}</h3>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="announcement-title">제목</label>
            <input
              id="announcement-title"
              value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="announcement-body">내용</label>
            <textarea
              id="announcement-body"
              rows={4}
              value={form.body}
              onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
              required
            />
          </div>
          <div className="field-checkbox" style={{ marginTop: 0, marginBottom: 12 }}>
            <input
              id="announcement-published"
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm((f) => ({ ...f, isPublished: event.target.checked }))}
            />
            <label htmlFor="announcement-published">즉시 게시</label>
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
      ) : items.length === 0 ? (
        <p className="empty">등록된 공지가 없습니다.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>제목</th>
              <th>게시 상태</th>
              <th>수정일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="제목">
                  <strong>{item.title}</strong>
                </td>
                <td data-label="게시 상태">
                  <span className={`pill ${item.isPublished ? 'pill-on' : 'pill-off'}`}>
                    {item.isPublished ? '게시중' : '비공개'}
                  </span>
                </td>
                <td data-label="수정일">{formatDateTime(item.updatedAt)}</td>
                <td data-label="관리">
                  <div className="actions-row">
                    <button type="button" className="btn btn-sm" onClick={() => togglePublish(item)}>
                      {item.isPublished ? '비공개로' : '게시'}
                    </button>
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
