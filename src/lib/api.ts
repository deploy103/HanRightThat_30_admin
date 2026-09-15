import type {
  Announcement,
  AnnouncementInput,
  AuditLogEntry,
  Booth,
  BoothInput,
  FestivalMeta,
  FestivalSettings,
  RankedBooth,
  ScheduleItem,
  ScheduleItemInput,
  Show,
  ShowInput,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const CSRF_COOKIE = 'hanbit_admin_csrf';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * 모든 요청에 세션 쿠키를 포함시키고(credentials: 'include'),
 * 상태를 바꾸는 요청에는 CSRF 쿠키 값을 헤더로 함께 보낸다 (double-submit 검증).
 * 실제 권한 검사는 서버(HanRightThat_30)가 하고, 여기서는 UX 를 위한 것일 뿐이다.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  if (method !== 'GET') {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const response = await fetch(`${API_URL}/api/admin${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `요청이 실패했습니다. (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* 본문이 JSON 이 아니면 기본 메시지를 쓴다. */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const api = {
  login: (username: string, password: string) =>
    request<{ username: string }>('/auth/login', { method: 'POST', ...json({ username, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  session: () => request<{ username: string | null }>('/auth/session'),
  me: () => request<{ username: string; lastLoginAt: string | null }>('/me'),

  getBooths: () => request<Booth[]>('/booths'),
  createBooth: (input: BoothInput) => request<Booth>('/booths', { method: 'POST', ...json(input) }),
  updateBooth: (id: string, input: BoothInput) =>
    request<Booth>(`/booths/${id}`, { method: 'PUT', ...json(input) }),
  archiveBooth: (id: string) => request<Booth>(`/booths/${id}`, { method: 'DELETE' }),
  restoreBooth: (id: string) => request<Booth>(`/booths/${id}/restore`, { method: 'POST' }),

  getPerformances: () => request<Show[]>('/performances'),
  createPerformance: (input: ShowInput) =>
    request<Show>('/performances', { method: 'POST', ...json(input) }),
  updatePerformance: (id: string, input: ShowInput) =>
    request<Show>(`/performances/${id}`, { method: 'PUT', ...json(input) }),
  deletePerformance: (id: string) => request<void>(`/performances/${id}`, { method: 'DELETE' }),
  reorderPerformances: (ids: string[]) =>
    request<Show[]>('/performances/order', { method: 'PUT', ...json({ ids }) }),

  getSchedule: () => request<ScheduleItem[]>('/schedule'),
  createScheduleItem: (input: ScheduleItemInput) =>
    request<ScheduleItem>('/schedule', { method: 'POST', ...json(input) }),
  updateScheduleItem: (id: string, input: ScheduleItemInput) =>
    request<ScheduleItem>(`/schedule/${id}`, { method: 'PUT', ...json(input) }),
  deleteScheduleItem: (id: string) => request<void>(`/schedule/${id}`, { method: 'DELETE' }),

  getAnnouncements: () => request<Announcement[]>('/announcements'),
  createAnnouncement: (input: AnnouncementInput) =>
    request<Announcement>('/announcements', { method: 'POST', ...json(input) }),
  updateAnnouncement: (id: string, input: AnnouncementInput) =>
    request<Announcement>(`/announcements/${id}`, { method: 'PUT', ...json(input) }),
  deleteAnnouncement: (id: string) => request<void>(`/announcements/${id}`, { method: 'DELETE' }),

  getMeta: () => request<FestivalMeta>('/meta'),
  updateMeta: (meta: FestivalMeta) =>
    request<{ meta: FestivalMeta }>('/meta', { method: 'PUT', ...json(meta) }),

  getSettings: () => request<FestivalSettings>('/settings'),
  updateSettings: (input: FestivalSettings) =>
    request<FestivalSettings>('/settings', { method: 'PUT', ...json(input) }),

  getRankings: () => request<{ rankingsPublic: boolean; rankings: RankedBooth[] }>('/rankings'),

  getAuditLogs: (limit = 200) => request<AuditLogEntry[]>(`/audit-logs?limit=${limit}`),
};
