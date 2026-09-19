/**
 * HanRightThat_30 의 /api/admin/* 응답 모양을 이 저장소 자체적으로 정의한 것.
 * 두 저장소는 파일을 공유하지 않으므로(오직 HTTP API 로만 연결) 타입을 각자 유지한다.
 */

export type FloorId = 2 | 3;

export interface BoothPosition {
  /** 배치도 대비 % (부스 영역의 중심) */
  x: number;
  y: number;
}

/** 부스 영역 크기 (배치도 대비 %). 픽셀이 아니라서 화면 크기가 달라도 위치가 맞는다. */
export interface BoothSize {
  w: number;
  h: number;
}

export interface Booth {
  id: string;
  name: string;
  team: string;
  floor: FloorId;
  amount: number;
  place?: string;
  position: BoothPosition;
  size?: BoothSize;
  isActive: boolean;
  isPublic: boolean;
  archivedAt: string | null;
  summary?: string;
  description?: string;
  imagePath?: string;
  imageAlt?: string;
}

export type BoothInput = Omit<Booth, 'id' | 'archivedAt'>;

export interface Show {
  id: string;
  order: number;
  time: string;
  team: string;
  title: string;
  genre?: string;
  note?: string;
}

export type ShowInput = Omit<Show, 'id' | 'order'>;

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  note?: string;
}

export type ScheduleItemInput = Omit<ScheduleItem, 'id'>;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>;

export interface FestivalMeta {
  updated: string;
  goal: number;
  stage: string;
}

export interface FestivalSettings {
  rankingsPublic: boolean;
}

export type RankTier = 'gold' | 'silver' | 'bronze' | 'normal';

export interface RankedBooth {
  booth: Booth;
  rank: number;
  tier: RankTier;
  ratio: number;
}

/**
 * 소개 콘텐츠 (HANWOL-INTRO-V1). HanRightThat_30 요구사항2.md와 동일한 계약을 따른다.
 * 두 저장소는 소스를 공유하지 않으므로 타입도 각자 다시 선언한다.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingContent {
  festivalName: string;
  edition: number;
  year: number;
  theme: string;
  heroTitle: string;
  heroDescription: string;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string;
  address: string;
  directionsUrl: string;
  themeTitle: string;
  themeBody: string;
  audienceInfo: string;
  admissionInfo: string;
  paymentInfo: string;
  operatingHoursInfo: string;
  contactInfo: string;
  organizerText: string;
  creditsText: string;
  faqItems: FaqItem[];
}

export interface LandingState {
  revision: number;
  draft: LandingContent;
  published: LandingContent | null;
  publishedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ip: string;
}

// ---------------------------------------------------------------------------
// 층 배치도 (GET /api/public/floor-plans) — 공개 사이트 렌더러와 같은 데이터를 쓴다.
// 이 저장소에 레이아웃을 복제해 두면 두 화면의 좌표가 어긋나므로 항상 API 에서 받아 온다.
// ---------------------------------------------------------------------------

export type RoomTone = 'room' | 'special' | 'stair' | 'service';

export interface FloorRoom {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: RoomTone;
}

export interface FloorPlanDef {
  id: FloorId;
  label: string;
  hint: string;
  rooms: FloorRoom[];
}

export interface FloorPlansResponse {
  aspect: { width: number; height: number };
  defaultBoothSize: BoothSize;
  minBoothSize: BoothSize;
  floors: FloorPlanDef[];
}

// ---------------------------------------------------------------------------
// 인증 / 2단계 인증
// ---------------------------------------------------------------------------

/** PASSWORD_VERIFIED = 비밀번호만 통과(관리자 API 사용 불가) / TWO_FACTOR_VERIFIED = 정식 관리자 세션 */
export type SessionStage = 'PASSWORD_VERIFIED' | 'TWO_FACTOR_VERIFIED';

/** 다음에 무엇을 해야 하는지 — setup(최초 등록) / verify(코드 입력) / null(완료) */
export type AuthNextStep = 'setup' | 'verify' | null;

export interface SessionInfo {
  username: string | null;
  stage: SessionStage | null;
  twoFactorEnabled: boolean;
  next: AuthNextStep;
}

export interface TwoFactorSetupResponse {
  /** 수동 입력용 키. 등록이 끝나면 다시는 조회할 수 없다. */
  secret: string;
  otpauthUrl: string;
  /** data: URL 형태의 QR 이미지 */
  qrDataUrl: string;
  issuer: string;
}

export interface TwoFactorEnableResponse {
  username: string;
  stage: SessionStage;
  /** 최초 1회만 내려오는 복구 코드 원문 */
  recoveryCodes: string[];
}

export interface TwoFactorVerifyResponse {
  username: string;
  stage: SessionStage;
  usedRecoveryCode: boolean;
  remainingRecoveryCodes: number;
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  remainingRecoveryCodes: number;
}

export interface UploadedImage {
  imagePath: string;
  bytes: number;
  mimeType: string;
}
