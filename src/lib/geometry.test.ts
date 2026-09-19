import { describe, expect, it } from 'vitest';
import { clampRectInside, fromRect, resizeRect, roundPercent, toRect, type Rect } from './geometry';

const DEFAULT = { w: 14, h: 10 };
const MIN = { w: 4, h: 4 };

describe('toRect / fromRect (공개 사이트와 같은 좌표 규칙)', () => {
  it('중심 + 크기를 왼쪽 위 + 크기로 바꾼다', () => {
    expect(toRect({ x: 61.5, y: 33 }, { w: 20, h: 10 }, DEFAULT)).toEqual({
      left: 51.5,
      top: 28,
      width: 20,
      height: 10,
    });
  });

  it('size 가 없는 기존 부스는 기본 크기로 계산한다', () => {
    expect(toRect({ x: 50, y: 50 }, undefined, DEFAULT)).toEqual({ left: 43, top: 45, width: 14, height: 10 });
  });

  it('왕복 변환이 값을 보존한다', () => {
    const position = { x: 40.5, y: 76 };
    const size = { w: 18, h: 13 };
    expect(fromRect(toRect(position, size, DEFAULT), MIN)).toEqual({ position, size });
  });

  it('배치도 밖으로 나가면 안쪽으로 밀어 넣는다', () => {
    expect(fromRect({ left: -30, top: -30, width: 20, height: 10 }, MIN)).toEqual({
      position: { x: 10, y: 5 },
      size: { w: 20, h: 10 },
    });
    expect(fromRect({ left: 120, top: 120, width: 20, height: 10 }, MIN)).toEqual({
      position: { x: 90, y: 95 },
      size: { w: 20, h: 10 },
    });
  });

  it('최소 크기 아래로는 저장되지 않는다', () => {
    expect(fromRect({ left: 10, top: 10, width: 0.2, height: 0 }, MIN).size).toEqual(MIN);
  });

  it('소수점 1자리로 반올림한다 (서버 requirePercent 와 동일)', () => {
    expect(roundPercent(33.333333)).toBe(33.3);
    expect(fromRect({ left: 10.04, top: 10.06, width: 14.07, height: 10.02 }, MIN).size).toEqual({ w: 14.1, h: 10 });
  });
});

describe('clampRectInside (드래그 이동)', () => {
  it('크기는 유지한 채 위치만 가둔다', () => {
    expect(clampRectInside({ left: -10, top: 50, width: 20, height: 10 })).toEqual({
      left: 0,
      top: 50,
      width: 20,
      height: 10,
    });
    expect(clampRectInside({ left: 95, top: 95, width: 20, height: 10 })).toEqual({
      left: 80,
      top: 90,
      width: 20,
      height: 10,
    });
  });
});

describe('resizeRect (모서리/변 끌기)', () => {
  const start: Rect = { left: 40, top: 40, width: 20, height: 20 };

  it('남동쪽 손잡이는 오른쪽/아래로만 늘린다 (왼쪽 위 고정)', () => {
    expect(resizeRect(start, 'se', 10, 5, MIN)).toEqual({ left: 40, top: 40, width: 30, height: 25 });
  });

  it('북서쪽 손잡이는 왼쪽 위를 움직이고 오른쪽 아래를 고정한다', () => {
    expect(resizeRect(start, 'nw', -10, -10, MIN)).toEqual({ left: 30, top: 30, width: 30, height: 30 });
  });

  it('변 손잡이는 한 축만 바꾼다 (다른 축 좌표/크기는 그대로)', () => {
    // 오른쪽 변: 세로 드래그(dy)는 무시된다.
    expect(resizeRect(start, 'e', 10, 99, MIN)).toEqual({ left: 40, top: 40, width: 30, height: 20 });
    // 위쪽 변: 가로 드래그(dx)는 무시되고 left 도 그대로다.
    expect(resizeRect(start, 'n', 99, -10, MIN)).toEqual({ left: 40, top: 30, width: 20, height: 30 });
  });

  it('반대쪽 변을 넘어가도 최소 크기 아래로 뒤집히지 않는다', () => {
    const flipped = resizeRect(start, 'nw', 100, 100, MIN);
    expect(flipped.width).toBeGreaterThanOrEqual(MIN.w);
    expect(flipped.height).toBeGreaterThanOrEqual(MIN.h);
    expect(flipped.left + flipped.width).toBeLessThanOrEqual(60.0001);
  });

  it('배치도 밖으로는 커지지 않는다', () => {
    const grown = resizeRect(start, 'se', 999, 999, MIN);
    expect(grown.left + grown.width).toBeLessThanOrEqual(100);
    expect(grown.top + grown.height).toBeLessThanOrEqual(100);

    const pulled = resizeRect(start, 'nw', -999, -999, MIN);
    expect(pulled.left).toBeGreaterThanOrEqual(0);
    expect(pulled.top).toBeGreaterThanOrEqual(0);
  });
});
