/**
 * datetime-local 입력값은 시간대 정보가 없다. 이 앱은 "입력값 = Asia/Seoul 벽시계 시간"으로
 * 고정하고, 저장할 때 항상 +09:00 오프셋을 붙인다. 반대로 서버에서 받은 ISO(어떤 오프셋이든)는
 * Asia/Seoul 벽시계 시간으로 환산해 입력창에 채운다 — 오프셋을 문자열로 잘라내지 않는다.
 */

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function isoToSeoulInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

/** "2026-10-09T13:00" (Asia/Seoul 벽시계) -> "2026-10-09T13:00:00+09:00" */
export function seoulInputValueToIso(value: string): string | null {
  if (!value) return null;
  return `${value}:00+09:00`;
}
