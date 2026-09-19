import type { BoothPosition, BoothSize } from '../types';

/**
 * 부스 좌표 계산.
 *
 * 공개 사이트(HanRightThat_30 shared/floorPlans.ts)와 **같은 규칙**을 쓴다.
 * - 저장 형식: position = 영역의 중심(%), size = 영역 크기(%)
 * - 그리기 형식: 왼쪽 위(left/top) + 크기
 * 두 저장소는 소스를 공유하지 않으므로, 이 규칙이 바뀌면 양쪽을 함께 고쳐야 한다.
 * (레이아웃 자체는 /api/public/floor-plans 에서 받아 오므로 복제되지 않는다.)
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 소수점 1자리 — 서버(requirePercent)와 같은 반올림 규칙. */
export function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function toRect(position: BoothPosition, size: BoothSize | undefined, fallback: BoothSize): Rect {
  const w = size?.w ?? fallback.w;
  const h = size?.h ?? fallback.h;
  return { left: position.x - w / 2, top: position.y - h / 2, width: w, height: h };
}

/** 배치도(0~100%) 밖으로 나가지 않게 가둔 뒤 저장 형식으로 되돌린다. */
export function fromRect(rect: Rect, min: BoothSize): { position: BoothPosition; size: BoothSize } {
  const w = clamp(rect.width, min.w, 100);
  const h = clamp(rect.height, min.h, 100);
  const left = clamp(rect.left, 0, 100 - w);
  const top = clamp(rect.top, 0, 100 - h);
  return {
    position: { x: roundPercent(left + w / 2), y: roundPercent(top + h / 2) },
    size: { w: roundPercent(w), h: roundPercent(h) },
  };
}

/** 이동 중인 사각형이 배치도를 벗어나지 않도록 크기는 유지한 채 위치만 민다. */
export function clampRectInside(rect: Rect): Rect {
  const width = clamp(rect.width, 0, 100);
  const height = clamp(rect.height, 0, 100);
  return {
    width,
    height,
    left: clamp(rect.left, 0, 100 - width),
    top: clamp(rect.top, 0, 100 - height),
  };
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * 모서리/변을 끌었을 때의 새 사각형.
 * 반대쪽 변은 고정하고, 최소 크기 아래로는 줄어들지 않게 막는다.
 */
export function resizeRect(start: Rect, handle: ResizeHandle, dx: number, dy: number, min: BoothSize): Rect {
  let { left, top, width, height } = start;
  const right = start.left + start.width;
  const bottom = start.top + start.height;

  if (handle.includes('w')) {
    left = clamp(start.left + dx, 0, right - min.w);
    width = right - left;
  }
  if (handle.includes('e')) {
    width = clamp(start.width + dx, min.w, 100 - start.left);
  }
  if (handle.includes('n')) {
    top = clamp(start.top + dy, 0, bottom - min.h);
    height = bottom - top;
  }
  if (handle.includes('s')) {
    height = clamp(start.height + dy, min.h, 100 - start.top);
  }

  return { left, top, width, height };
}
