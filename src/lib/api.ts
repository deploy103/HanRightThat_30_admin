import type {
  Announcement,
  AnnouncementInput,
  AuditLogEntry,
  Booth,
  BoothInput,
  FestivalMeta,
  FestivalSettings,
  FloorPlansResponse,
  LandingContent,
  LandingState,
  RankedBooth,
  ScheduleItem,
  ScheduleItemInput,
  SessionInfo,
  Show,
  ShowInput,
  TwoFactorEnableResponse,
  TwoFactorSetupResponse,
  TwoFactorStatus,
  TwoFactorVerifyResponse,
  UploadedImage,
} from '../types';

/** 브라우저가 직접 호출하는 공개 사이트/API 서버 주소. 부스 딥링크 등 공개 URL을 만들 때도 재사용한다. */
export const API_URL = import.meta.env.VITE_API_URL ?? '';
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

/**
 * 이미지 업로드. multipart 대신 파일 바이트를 그대로 본문으로 보낸다
 * (서버가 Content-Type 과 실제 매직 넘버를 함께 검사한다).
 */
async function uploadImage(file: File): Promise<UploadedImage> {
  const headers = new Headers({ 'Content-Type': file.type });
  const csrf = readCookie(CSRF_COOKIE);
  if (csrf) headers.set('X-CSRF-Token', csrf);

  const response = await fetch(`${API_URL}/api/admin/booth-images`, {
    method: 'POST',
    headers,
    body: file,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `업로드가 실패했습니다. (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* 본문이 JSON 이 아니면 기본 메시지를 쓴다. */
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as UploadedImage;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const api = {
  /** 1단계: 비밀번호만 검증한다. 성공해도 아직 관리자 API 는 쓸 수 없다. */
  login: (username: string, password: string) =>
    request<SessionInfo>('/auth/login', { method: 'POST', ...json({ username, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  session: () => request<SessionInfo>('/auth/session'),
  me: () => request<{ username: string; lastLoginAt: string | null }>('/me'),

  /** 2단계: 최초 등록(QR 발급 → 코드 확인) 또는 로그인 시 코드 검증. */
  twoFactorSetup: () => request<TwoFactorSetupResponse>('/auth/2fa/setup', { method: 'POST' }),
  twoFactorEnable: (code: string) =>
    request<TwoFactorEnableResponse>('/auth/2fa/enable', { method: 'POST', ...json({ code }) }),
  twoFactorVerify: (code: string) =>
    request<TwoFactorVerifyResponse>('/auth/2fa/verify', { method: 'POST', ...json({ code }) }),
  twoFactorRecover: (recoveryCode: string) =>
    request<TwoFactorVerifyResponse>('/auth/2fa/verify', { method: 'POST', ...json({ recoveryCode }) }),
  twoFactorStatus: () => request<TwoFactorStatus>('/2fa/status'),

  getBooths: () => request<Booth[]>('/booths'),
  createBooth: (input: BoothInput) => request<Booth>('/booths', { method: 'POST', ...json(input) }),
  updateBooth: (id: string, input: BoothInput) =>
    request<Booth>(`/booths/${id}`, { method: 'PUT', ...json(input) }),
  archiveBooth: (id: string) => request<Booth>(`/booths/${id}`, { method: 'DELETE' }),
  restoreBooth: (id: string) => request<Booth>(`/booths/${id}/restore`, { method: 'POST' }),

  uploadBoothImage: uploadImage,
  deleteBoothImage: (imagePath: string) =>
    request<void>(`/booth-images/${encodeURIComponent(imagePath.replace('/booth-images/', ''))}`, {
      method: 'DELETE',
    }),

  /**
   * 공개 사이트 렌더러와 동일한 층 배치도 (서버의 shared/floorPlans.ts 하나에서 나온다).
   * 관리자 API 로 받는 이유는 이 오리진에 대한 CORS/자격증명 설정이 /api/admin/* 에만 있기 때문이다.
   */
  getFloorPlans: () => request<FloorPlansResponse>('/floor-plans'),

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

  getLanding: () => request<LandingState>('/landing'),
  saveLandingDraft: (expectedRevision: number, content: LandingContent) =>
    request<LandingState>('/landing', { method: 'PUT', ...json({ expectedRevision, content }) }),
  publishLanding: (expectedRevision: number) =>
    request<LandingState>('/landing/publish', { method: 'POST', ...json({ expectedRevision }) }),
};
