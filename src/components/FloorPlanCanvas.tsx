import { forwardRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { RESIZE_HANDLES, type Rect, type ResizeHandle } from '../lib/geometry';
import type { FloorPlanDef, FloorRoom } from '../types';

/** 교실 칸을 편집할 때만 넘어오는 상호작용 묶음. 없으면 칸은 배경 그림처럼 그려진다. */
export interface RoomInteraction {
  selectedId: string | null;
  /** 드래그 중인 칸은 저장 전 임시 좌표로 그린다. */
  rectFor: (room: FloorRoom) => Rect;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, room: FloorRoom) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, room: FloorRoom) => void;
  onResizeStart: (event: PointerEvent<HTMLSpanElement>, room: FloorRoom, handle: ResizeHandle) => void;
}

interface Props {
  plan: FloorPlanDef;
  aspect: { width: number; height: number };
  /** 부스 레이어 — 편집기가 넣어 준다. */
  children?: ReactNode;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  className?: string;
  rooms?: RoomInteraction;
}

/**
 * 층 배치도 그리기 표면.
 *
 * 교실/복도/계단은 서버(/api/admin/floor-plans)에서 받은 데이터를 그대로 그리므로
 * 공개 사이트와 항상 같은 그림이 된다 — 칸을 고치면 양쪽에 함께 반영된다.
 * 좌표는 모두 %라서 컨테이너 크기가 달라져도 부스/칸 위치가 어긋나지 않는다.
 */
export const FloorPlanCanvas = forwardRef<HTMLDivElement, Props>(function FloorPlanCanvas(
  { plan, aspect, children, onPointerDown, className, rooms },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`fp-canvas${className ? ` ${className}` : ''}`}
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
      onPointerDown={onPointerDown}
    >
      <div className="fp-grid" aria-hidden="true" />

      {plan.rooms.map((room) => {
        if (!rooms) {
          return (
            <div
              key={room.id}
              className={`fp-room fp-room-${room.tone}`}
              style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%` }}
            >
              <span className="fp-room-label">{room.label}</span>
            </div>
          );
        }

        const rect = rooms.rectFor(room);
        const isSelected = room.id === rooms.selectedId;
        return (
          <div
            key={room.id}
            className={`fp-room fp-room-${room.tone} is-editable${isSelected ? ' is-selected' : ''}`}
            style={{
              left: `${rect.left}%`,
              top: `${rect.top}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${room.label} — 끌어서 이동, 방향키로 미세 조정`}
            onPointerDown={(event) => rooms.onPointerDown(event, room)}
            onKeyDown={(event) => rooms.onKeyDown(event, room)}
            onFocus={() => undefined}
          >
            <span className="fp-room-label">{room.label}</span>

            {isSelected
              ? RESIZE_HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className={`fp-handle fp-handle-${handle}`}
                    onPointerDown={(event) => rooms.onResizeStart(event, room, handle)}
                    aria-hidden="true"
                  />
                ))
              : null}
          </div>
        );
      })}

      {children}
    </div>
  );
});
