const wonFormatter = new Intl.NumberFormat('ko-KR');

export function formatWon(amount: number): string {
  return wonFormatter.format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR');
}
