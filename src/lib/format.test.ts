import { describe, expect, it } from 'vitest';
import { formatUpdatedLabel } from './format';

describe('순위 갱신 문구', () => {
  it('서울 시각 기준으로 만든다 (정각이면 분을 생략)', () => {
    expect(formatUpdatedLabel(new Date('2026-09-08T15:00:00+09:00'))).toBe('9월 8일 오후 3시 기준');
    expect(formatUpdatedLabel(new Date('2026-10-01T15:05:00+09:00'))).toBe('10월 1일 오후 3시 5분 기준');
  });

  it('자정/정오를 12시로 표시한다', () => {
    expect(formatUpdatedLabel(new Date('2026-10-01T00:30:00+09:00'))).toBe('10월 1일 오전 12시 30분 기준');
    expect(formatUpdatedLabel(new Date('2026-10-01T12:00:00+09:00'))).toBe('10월 1일 오후 12시 기준');
  });

  it('UTC 로 넘어온 시각도 서울 날짜로 바꾼다', () => {
    expect(formatUpdatedLabel(new Date('2026-09-30T16:00:00Z'))).toBe('10월 1일 오전 1시 기준');
  });
});
