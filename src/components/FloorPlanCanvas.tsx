import { forwardRef, type PointerEvent, type ReactNode } from 'react';
import type { FloorPlanDef } from '../types';

interface Props {
  plan: FloorPlanDef;
  aspect: { width: number; height: number };
  /** 부스 레이어 — 편집기가 넣어 준다. */
  children?: ReactNode;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  className?: string;
}

/**
 * 층 배치도 그리기 표면.
 *
 * 교실/복도/계단은 서버(/api/public/floor-plans)에서 받은 데이터를 그대로 그리므로
 * 공개 사이트와 항상 같은 그림이 된다 — 왼쪽 계단 제거 같은 변경도 서버만 고치면 양쪽에 반영된다.
 * 좌표는 모두 %라서 컨테이너 크기가 달라져도 부스 위치가 어긋나지 않는다.
 */
export const FloorPlanCanvas = forwardRef<HTMLDivElement, Props>(function FloorPlanCanvas(
  { plan, aspect, children, onPointerDown, className },
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

      {plan.rooms.map((room) => (
        <div
          key={room.id}
          className={`fp-room fp-room-${room.tone}`}
          style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%` }}
        >
          <span className="fp-room-label">{room.label}</span>
        </div>
      ))}

      {children}
    </div>
  );
});
