const wonFormatter = new Intl.NumberFormat('ko-KR');

export function formatWon(amount: number): string {
  return wonFormatter.format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR');
}

const seoulParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

/** 순위 갱신 문구 기본값. 관리자 PC 시간대와 무관하게 서울 기준 — 예: "10월 1일 오후 3시 5분 기준" (정각이면 분 생략) */
export function formatUpdatedLabel(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(seoulParts.formatToParts(date).find((item) => item.type === type)?.value);
  const hour = part('hour');
  const minute = part('minute');
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${part('month')}월 ${part('day')}일 ${hour < 12 ? '오전' : '오후'} ${hour12}시${minute ? ` ${minute}분` : ''} 기준`;
}
