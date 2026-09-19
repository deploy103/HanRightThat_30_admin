import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FloorPlanCanvas } from '../components/FloorPlanCanvas';
import { api, ApiError } from '../lib/api';
import {
  clampRectInside,
  fromRect,
  resizeRect,
  RESIZE_HANDLES,
  roundPercent,
  toRect,
  type Rect,
  type ResizeHandle,
} from '../lib/geometry';
import type { Booth, BoothInput, BoothSize, FloorId, FloorPlansResponse } from '../types';

/** 드래그로 새 부스를 만들 때, 이보다 작으면 "잘못 누른 것"으로 보고 무시한다. */
const MIN_CREATE_SIZE = 3;

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: number } | { kind: 'error'; message: string };

type Drag =
  | { mode: 'move'; id: string; startRect: Rect; origin: { x: number; y: number } }
  | { mode: 'resize'; id: string; handle: ResizeHandle; startRect: Rect; origin: { x: number; y: number } }
  | { mode: 'create'; origin: { x: number; y: number }; current: { x: number; y: number } };

interface NewBoothDraft {
  rect: Rect;
  name: string;
  team: string;
  place: string;
  amount: number;
  isPublic: boolean;
  isActive: boolean;
}

/** 부스를 PUT 할 때 보내는 전체 입력 — 일부 필드만 바꾸더라도 나머지는 기존 값을 그대로 유지한다. */
function toInput(booth: Booth, overrides: Partial<BoothInput> = {}): BoothInput {
  return {
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
    ...overrides,
  };
}

export function BoothMapPage() {
  const [plans, setPlans] = useState<FloorPlansResponse | null>(null);
  const [booths, setBooths] = useState<Booth[] | null>(null);
  const [floor, setFloor] = useState<FloorId>(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draftRect, setDraftRect] = useState<Rect | null>(null);
  const [newBooth, setNewBooth] = useState<NewBoothDraft | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Booth | null>(null);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const nudgeTimer = useRef<number | null>(null);

  // 서버가 내려주는 값이 없을 때만 쓰는 대비값. 매 렌더마다 새 객체가 되지 않도록 메모한다
  // (드래그 핸들러의 의존성이 계속 바뀌면 이동 중에 리스너가 재등록된다).
  const defaultSize: BoothSize = useMemo(() => plans?.defaultBoothSize ?? { w: 14, h: 10 }, [plans]);
  const minSize: BoothSize = useMemo(() => plans?.minBoothSize ?? { w: 4, h: 4 }, [plans]);

  const load = useCallback(async () => {
    try {
      const [planData, boothData] = await Promise.all([api.getFloorPlans(), api.getBooths()]);
      setPlans(planData);
      setBooths(boothData);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '배치도를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const plan = plans?.floors.find((item) => item.id === floor) ?? null;

  /** 보관된 부스는 편집기에 띄우지 않는다 (공개 화면에도 없다). */
  const activeBooths = useMemo(() => (booths ?? []).filter((booth) => !booth.archivedAt), [booths]);
  const floorBooths = useMemo(() => activeBooths.filter((booth) => booth.floor === floor), [activeBooths, floor]);
  const selected = activeBooths.find((booth) => booth.id === selectedId) ?? null;

  // --- 좌표 변환: 화면 픽셀 → 배치도 % --------------------------------------

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    return {
      x: ((clientX - box.left) / box.width) * 100,
      y: ((clientY - box.top) / box.height) * 100,
    };
  }, []);

  // --- 저장 -----------------------------------------------------------------

  const persistGeometry = useCallback(
    async (booth: Booth, rect: Rect) => {
      const geometry = fromRect(rect, minSize);
      setSave({ kind: 'saving' });
      try {
        const updated = await api.updateBooth(booth.id, toInput(booth, geometry));
        setBooths((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
        setSave({ kind: 'saved', at: Date.now() });
      } catch (cause) {
        // 저장에 실패하면 서버 값으로 되돌려 화면과 실제 데이터가 어긋나지 않게 한다.
        setSave({ kind: 'error', message: cause instanceof ApiError ? cause.message : '저장하지 못했습니다.' });
        void load();
      }
    },
    [load, minSize],
  );

  // --- 드래그 (이동/크기 조절/새로 만들기) ------------------------------------

  useEffect(() => {
    if (!drag) return;

    function handleMove(event: PointerEvent) {
      const point = toPercent(event.clientX, event.clientY);
      const current = dragRef.current;
      if (!current) return;

      if (current.mode === 'create') {
        setDrag({ ...current, current: point });
        dragRef.current = { ...current, current: point };
        return;
      }

      const dx = point.x - current.origin.x;
      const dy = point.y - current.origin.y;
      if (current.mode === 'move') {
        setDraftRect(
          clampRectInside({
            ...current.startRect,
            left: current.startRect.left + dx,
            top: current.startRect.top + dy,
          }),
        );
      } else {
        setDraftRect(resizeRect(current.startRect, current.handle, dx, dy, minSize));
      }
    }

    function handleUp() {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;

      if (current.mode === 'create') {
        const rect = clampRectInside({
          left: Math.min(current.origin.x, current.current.x),
          top: Math.min(current.origin.y, current.current.y),
          width: Math.abs(current.current.x - current.origin.x),
          height: Math.abs(current.current.y - current.origin.y),
        });
        // 살짝 스친 클릭은 새 부스를 만들지 않는다 (잘못된 영역 방지).
        if (rect.width < MIN_CREATE_SIZE || rect.height < MIN_CREATE_SIZE) return;
        setNewBooth({
          rect,
          name: '',
          team: '',
          place: '',
          amount: 0,
          isPublic: true,
          isActive: true,
        });
        return;
      }

      const booth = (booths ?? []).find((item) => item.id === current.id);
      const rect = draftRect;
      setDraftRect(null);
      if (booth && rect) void persistGeometry(booth, rect);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [drag, booths, draftRect, minSize, persistGeometry, toPercent]);

  function startMove(event: ReactPointerEvent, booth: Booth) {
    event.stopPropagation();
    event.preventDefault();
    setSelectedId(booth.id);
    const next: Drag = {
      mode: 'move',
      id: booth.id,
      startRect: toRect(booth.position, booth.size, defaultSize),
      origin: toPercent(event.clientX, event.clientY),
    };
    dragRef.current = next;
    setDrag(next);
    setDraftRect(next.startRect);
  }

  function startResize(event: ReactPointerEvent, booth: Booth, handle: ResizeHandle) {
    event.stopPropagation();
    event.preventDefault();
    setSelectedId(booth.id);
    const next: Drag = {
      mode: 'resize',
      id: booth.id,
      handle,
      startRect: toRect(booth.position, booth.size, defaultSize),
      origin: toPercent(event.clientX, event.clientY),
    };
    dragRef.current = next;
    setDrag(next);
    setDraftRect(next.startRect);
  }

  function startCreate(event: ReactPointerEvent<HTMLDivElement>) {
    // 빈 공간에서 시작한 드래그만 새 부스 만들기로 본다.
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains('fp-room')) {
      return;
    }
    if (newBooth) return;
    event.preventDefault();
    setSelectedId(null);
    const point = toPercent(event.clientX, event.clientY);
    const next: Drag = { mode: 'create', origin: point, current: point };
    dragRef.current = next;
    setDrag(next);
  }

  // --- 키보드 미세 조정 -------------------------------------------------------

  function nudge(booth: Booth, dx: number, dy: number) {
    const rect = clampRectInside({
      ...toRect(booth.position, booth.size, defaultSize),
      left: toRect(booth.position, booth.size, defaultSize).left + dx,
      top: toRect(booth.position, booth.size, defaultSize).top + dy,
    });
    const geometry = fromRect(rect, minSize);
    // 화면은 먼저 움직이고, 연속 입력이 끝난 뒤 한 번만 저장한다.
    setBooths((current) => (current ?? []).map((item) => (item.id === booth.id ? { ...item, ...geometry } : item)));
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      void persistGeometry({ ...booth, ...geometry }, rect);
    }, 500);
  }

  function handleBoothKeyDown(event: React.KeyboardEvent, booth: Booth) {
    const step = event.shiftKey ? 2 : 0.5;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    nudge(booth, move[0], move[1]);
  }

  // --- 새 부스 저장 -----------------------------------------------------------

  async function createBooth() {
    if (!newBooth) return;
    setBusy(true);
    setError(null);
    try {
      const geometry = fromRect(newBooth.rect, minSize);
      const created = await api.createBooth({
        name: newBooth.name,
        team: newBooth.team,
        floor,
        amount: newBooth.amount,
        place: newBooth.place,
        position: geometry.position,
        size: geometry.size,
        isActive: newBooth.isActive,
        isPublic: newBooth.isPublic,
        summary: '',
        description: '',
        imagePath: '',
        imageAlt: '',
      });
      setBooths((current) => [...(current ?? []), created]);
      setSelectedId(created.id);
      setNewBooth(null);
      setSave({ kind: 'saved', at: Date.now() });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '부스를 만들지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function updateSelected(patch: Partial<BoothInput>) {
    if (!selected) return;
    setSave({ kind: 'saving' });
    try {
      const updated = await api.updateBooth(selected.id, toInput(selected, patch));
      setBooths((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
      setSave({ kind: 'saved', at: Date.now() });
    } catch (cause) {
      setSave({ kind: 'error', message: cause instanceof ApiError ? cause.message : '저장하지 못했습니다.' });
    }
  }

  async function archiveSelected() {
    if (!confirmArchive) return;
    setBusy(true);
    try {
      await api.archiveBooth(confirmArchive.id);
      setBooths((current) => (current ?? []).filter((item) => item.id !== confirmArchive.id));
      setSelectedId(null);
      setConfirmArchive(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '보관하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  // --- 렌더 -------------------------------------------------------------------

  const createPreview =
    drag?.mode === 'create'
      ? clampRectInside({
          left: Math.min(drag.origin.x, drag.current.x),
          top: Math.min(drag.origin.y, drag.current.y),
          width: Math.abs(drag.current.x - drag.origin.x),
          height: Math.abs(drag.current.y - drag.origin.y),
        })
      : newBooth?.rect ?? null;

  function rectFor(booth: Booth): Rect {
    if (draftRect && drag && drag.mode !== 'create' && drag.id === booth.id) return draftRect;
    return toRect(booth.position, booth.size, defaultSize);
  }

  return (
    <>
      <div className="page-head">
        <h1>부스 배치도</h1>
        <div className="actions-row">
          <div className="floor-switch" role="group" aria-label="층 선택">
            {(plans?.floors ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                className="floor-switch-tab"
                aria-pressed={item.id === floor}
                onClick={() => {
                  setFloor(item.id);
                  setSelectedId(null);
                  setNewBooth(null);
                }}
              >
                {item.label}
                <small>{activeBooths.filter((booth) => booth.floor === item.id).length}개</small>
              </button>
            ))}
          </div>
          <span className={`save-badge save-${save.kind}`} role="status" aria-live="polite">
            {save.kind === 'saving'
              ? '저장 중…'
              : save.kind === 'saved'
                ? '저장됨'
                : save.kind === 'error'
                  ? `저장 실패: ${save.message}`
                  : '변경하면 자동 저장됩니다'}
          </span>
        </div>
      </div>

      <p className="page-lede">
        지도 위 <b>빈 공간을 드래그</b>하면 새 부스 영역이 만들어지고, <b>부스를 끌면</b> 위치가,{' '}
        <b>모서리를 잡으면</b> 크기가 바뀝니다. 좌표는 배치도 대비 비율로 저장되어 공개 화면의 PC·모바일에서 같은
        위치에 표시됩니다.
      </p>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      {!plans || !booths ? (
        <p className="empty">불러오는 중…</p>
      ) : !plan ? (
        <p className="empty">층 배치도를 찾을 수 없습니다.</p>
      ) : (
        <div className="map-editor-layout">
          <div className="map-editor-canvas-wrap">
            <p className="fp-caption">
              <b>{plan.label}</b>
              <span>{plan.hint}</span>
            </p>

            <FloorPlanCanvas
              ref={canvasRef}
              plan={plan}
              aspect={plans.aspect}
              className={drag?.mode === 'create' ? 'is-drawing' : ''}
              onPointerDown={startCreate}
            >
              {floorBooths.map((booth, index) => {
                const rect = rectFor(booth);
                const isSelected = booth.id === selectedId;
                return (
                  <div
                    key={booth.id}
                    className={`fp-booth${isSelected ? ' is-selected' : ''}${booth.isPublic ? '' : ' is-private'}`}
                    style={{
                      left: `${rect.left}%`,
                      top: `${rect.top}%`,
                      width: `${rect.width}%`,
                      height: `${rect.height}%`,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${booth.name} — 끌어서 이동, 방향키로 미세 조정`}
                    onPointerDown={(event) => startMove(event, booth)}
                    onKeyDown={(event) => handleBoothKeyDown(event, booth)}
                    onFocus={() => setSelectedId(booth.id)}
                  >
                    <span className="fp-booth-index">{index + 1}</span>
                    <span className="fp-booth-name">{booth.name}</span>

                    {isSelected
                      ? RESIZE_HANDLES.map((handle) => (
                          <span
                            key={handle}
                            className={`fp-handle fp-handle-${handle}`}
                            onPointerDown={(event) => startResize(event, booth, handle)}
                            aria-hidden="true"
                          />
                        ))
                      : null}
                  </div>
                );
              })}

              {createPreview ? (
                <div
                  className="fp-draft"
                  style={{
                    left: `${createPreview.left}%`,
                    top: `${createPreview.top}%`,
                    width: `${createPreview.width}%`,
                    height: `${createPreview.height}%`,
                  }}
                  aria-hidden="true"
                />
              ) : null}
            </FloorPlanCanvas>

            <p className="fp-hint">
              선택한 부스는 방향키로 0.5%씩(Shift +2%) 옮길 수 있습니다. 부스는 배치도 밖으로 나가지 않습니다.
            </p>
          </div>

          <aside className="map-editor-panel">
            {newBooth ? (
              <form
                className="card"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createBooth();
                }}
              >
                <h3>새 부스</h3>
                <p className="field-hint">
                  {plan.label} · 가로 {roundPercent(newBooth.rect.width)}% × 세로 {roundPercent(newBooth.rect.height)}%
                </p>
                <div className="field">
                  <label htmlFor="new-name">부스명</label>
                  <input
                    id="new-name"
                    value={newBooth.name}
                    onChange={(event) => setNewBooth({ ...newBooth, name: event.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-team">팀/학급</label>
                  <input
                    id="new-team"
                    value={newBooth.team}
                    onChange={(event) => setNewBooth({ ...newBooth, team: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-place">위치 설명</label>
                  <input
                    id="new-place"
                    value={newBooth.place}
                    placeholder={`${plan.label} 복도`}
                    onChange={(event) => setNewBooth({ ...newBooth, place: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-amount">모금액</label>
                  <input
                    id="new-amount"
                    type="number"
                    min={0}
                    value={newBooth.amount}
                    onChange={(event) => setNewBooth({ ...newBooth, amount: Number(event.target.value) })}
                  />
                </div>
                <div className="field-checkbox" style={{ marginTop: 10 }}>
                  <input
                    id="new-public"
                    type="checkbox"
                    checked={newBooth.isPublic}
                    onChange={(event) => setNewBooth({ ...newBooth, isPublic: event.target.checked })}
                  />
                  <label htmlFor="new-public">공개</label>
                </div>
                <div className="actions-row" style={{ marginTop: 14 }}>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? '만드는 중…' : '부스 만들기'}
                  </button>
                  <button type="button" className="btn" onClick={() => setNewBooth(null)} disabled={busy}>
                    취소
                  </button>
                </div>
              </form>
            ) : selected ? (
              <div className="card">
                <h3>{selected.name}</h3>
                <p className="field-hint">
                  {selected.team} · {selected.place || `${selected.floor}층`}
                </p>

                <dl className="geometry-readout">
                  <div>
                    <dt>중심</dt>
                    <dd>
                      {selected.position.x}% , {selected.position.y}%
                    </dd>
                  </div>
                  <div>
                    <dt>크기</dt>
                    <dd>
                      {(selected.size ?? defaultSize).w}% × {(selected.size ?? defaultSize).h}%
                    </dd>
                  </div>
                </dl>

                <div className="field">
                  <label htmlFor="edit-name">부스명</label>
                  <input
                    id="edit-name"
                    key={`${selected.id}-name`}
                    defaultValue={selected.name}
                    onBlur={(event) => {
                      if (event.target.value.trim() && event.target.value !== selected.name) {
                        void updateSelected({ name: event.target.value.trim() });
                      }
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-team">팀/학급</label>
                  <input
                    id="edit-team"
                    key={`${selected.id}-team`}
                    defaultValue={selected.team}
                    onBlur={(event) => {
                      if (event.target.value.trim() && event.target.value !== selected.team) {
                        void updateSelected({ team: event.target.value.trim() });
                      }
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-place">위치 설명</label>
                  <input
                    id="edit-place"
                    key={`${selected.id}-place`}
                    defaultValue={selected.place ?? ''}
                    onBlur={(event) => {
                      if (event.target.value !== (selected.place ?? '')) {
                        void updateSelected({ place: event.target.value });
                      }
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-floor">층</label>
                  <select
                    id="edit-floor"
                    value={selected.floor}
                    onChange={(event) => void updateSelected({ floor: Number(event.target.value) as FloorId })}
                  >
                    {(plans?.floors ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-checkbox" style={{ marginTop: 10 }}>
                  <input
                    id="edit-public"
                    type="checkbox"
                    checked={selected.isPublic}
                    onChange={(event) => void updateSelected({ isPublic: event.target.checked })}
                  />
                  <label htmlFor="edit-public">공개</label>
                </div>
                <div className="field-checkbox" style={{ marginTop: 6 }}>
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={selected.isActive}
                    onChange={(event) => void updateSelected({ isActive: event.target.checked })}
                  />
                  <label htmlFor="edit-active">운영 중</label>
                </div>

                <div className="actions-row" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void updateSelected({ size: { ...defaultSize } })}
                  >
                    기본 크기로
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => setConfirmArchive(selected)}>
                    보관
                  </button>
                </div>
              </div>
            ) : (
              <div className="card map-editor-empty">
                <h3>부스를 선택하세요</h3>
                <p className="field-hint">
                  지도에서 부스를 누르면 여기에서 이름·팀·공개 여부를 바로 고칠 수 있습니다. 빈 공간을 드래그하면 새
                  부스를 만듭니다.
                </p>
                <ul className="legend-list">
                  <li>
                    <span className="legend-chip legend-booth" /> 공개 부스
                  </li>
                  <li>
                    <span className="legend-chip legend-private" /> 비공개 부스
                  </li>
                  <li>
                    <span className="legend-chip legend-draft" /> 새로 그리는 영역
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive !== null}
        title="이 부스를 보관할까요?"
        description={
          <>
            <b>{confirmArchive?.name}</b> 부스가 공개 지도와 목록에서 즉시 사라집니다. 부스 관리 화면에서 다시 복원할
            수 있습니다.
          </>
        }
        confirmLabel="보관"
        danger
        busy={busy}
        onConfirm={() => void archiveSelected()}
        onCancel={() => setConfirmArchive(null)}
      />
    </>
  );
}
