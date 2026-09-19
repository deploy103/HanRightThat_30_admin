import { useEffect, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.deleteAnnouncement(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '삭제하지 못했습니다.');
    } finally {
      setBusy(false);
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
        게시된 공지만 공개 사이트에 노출됩니다 — 소개 페이지(<code>/</code>)의 "공지" 구역과 축제 화면의{' '}
        <code>/play/notice</code> 공지 탭 두 곳입니다. 게시 여부를 끄면 즉시 사라집니다. 내용은 일반 텍스트로만
        표시되며 HTML 태그는 그대로 글자로 보입니다.
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
              rows={6}
              maxLength={2000}
              value={form.body}
              onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
              required
            />
            <p className="field-hint">줄바꿈은 공개 화면에도 그대로 표시됩니다. (최대 2000자)</p>
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
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(item)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="이 공지를 삭제할까요?"
        description={
          <>
            <b>{confirmDelete?.title}</b> 공지가 완전히 삭제됩니다. 되돌릴 수 없으니, 잠시 내리기만 하려면 대신 "비공개로"를
            사용하세요.
          </>
        }
        confirmLabel="삭제"
        danger
        busy={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
