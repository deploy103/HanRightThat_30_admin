import type { FloorPlanDef, FloorRoom, RoomTone } from '../types';

/** 칸 종류를 한국어로 보여 준다. 값 자체는 서버(shared/floorPlans.ts)가 정한다. */
const TONE_LABELS: Record<RoomTone, string> = {
  room: '교실',
  special: '특별실',
  stair: '계단',
  service: '복도·기타',
};

export function toneLabel(tone: RoomTone): string {
  return TONE_LABELS[tone] ?? tone;
}

interface Props {
  plan: FloorPlanDef;
  selected: FloorRoom | null;
  tones: RoomTone[];
  maxRooms: number;
  busy: boolean;
  onUpdateRoom: (id: string, patch: Partial<FloorRoom>) => void;
  onDeleteRoom: (room: FloorRoom) => void;
  onAddRoom: () => void;
  onUpdatePlan: (patch: { label?: string; hint?: string }) => void;
  onReset: () => void;
}

/**
 * 교실 편집 모드의 오른쪽 패널.
 * 칸 하나의 이름·종류·좌표를 고치거나 지우고, 층 이름과 "기본값으로 되돌리기" 도 여기서 처리한다.
 */
export function RoomPanel({
  plan,
  selected,
  tones,
  maxRooms,
  busy,
  onUpdateRoom,
  onDeleteRoom,
  onAddRoom,
  onUpdatePlan,
  onReset,
}: Props) {
  return (
    <>
      {selected ? (
        <div className="card">
          <h3>{selected.label}</h3>
          <p className="field-hint">{toneLabel(selected.tone)} 칸</p>

          <dl className="geometry-readout">
            <div>
              <dt>왼쪽 위</dt>
              <dd>
                {selected.x}% , {selected.y}%
              </dd>
            </div>
            <div>
              <dt>크기</dt>
              <dd>
                {selected.w}% × {selected.h}%
              </dd>
            </div>
          </dl>

          <div className="field">
            <label htmlFor="room-label">칸 이름</label>
            <input
              id="room-label"
              key={`${selected.id}-label`}
              defaultValue={selected.label}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next && next !== selected.label) onUpdateRoom(selected.id, { label: next });
                else event.target.value = selected.label;
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="room-tone">칸 종류</label>
            <select
              id="room-tone"
              value={selected.tone}
              onChange={(event) => onUpdateRoom(selected.id, { tone: event.target.value as RoomTone })}
            >
              {tones.map((tone) => (
                <option key={tone} value={tone}>
                  {toneLabel(tone)}
                </option>
              ))}
            </select>
          </div>

          <div className="actions-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-danger" onClick={() => onDeleteRoom(selected)} disabled={busy}>
              칸 삭제
            </button>
          </div>
        </div>
      ) : (
        <div className="card map-editor-empty">
          <h3>교실 칸을 선택하세요</h3>
          <p className="field-hint">
            지도에서 칸을 누르면 여기에서 이름·종류를 고치고 지울 수 있습니다. 새 칸은 아래 "칸 추가" 버튼으로
            만든 뒤 원하는 자리로 끌어다 놓으세요 (빈 공간을 드래그해도 만들어집니다).
          </p>
          <ul className="legend-list">
            {tones.map((tone) => (
              <li key={tone}>
                <span className={`legend-chip legend-room legend-room-${tone}`} /> {toneLabel(tone)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h3>{plan.label} 전체</h3>
        <p className="field-hint">
          칸 {plan.rooms.length}개 / 최대 {maxRooms}개
        </p>

        <div className="field">
          <label htmlFor="plan-label">층 이름</label>
          <input
            id="plan-label"
            key={`${plan.id}-label`}
            defaultValue={plan.label}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== plan.label) onUpdatePlan({ label: next });
              else event.target.value = plan.label;
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="plan-hint">층 설명</label>
          <input
            id="plan-hint"
            key={`${plan.id}-hint`}
            defaultValue={plan.hint}
            placeholder="예: 본관 4층 · 중앙 복도 기준"
            onBlur={(event) => {
              if (event.target.value !== plan.hint) onUpdatePlan({ hint: event.target.value });
            }}
          />
        </div>

        <div className="actions-row" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn"
            onClick={onAddRoom}
            disabled={busy || plan.rooms.length >= maxRooms}
          >
            칸 추가
          </button>
          <button type="button" className="btn btn-danger" onClick={onReset} disabled={busy}>
            기본값으로 되돌리기
          </button>
        </div>
      </div>
    </>
  );
}
