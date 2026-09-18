/**
 * HanRightThat_30 의 /api/admin/* 응답 모양을 이 저장소 자체적으로 정의한 것.
 * 두 저장소는 파일을 공유하지 않으므로(오직 HTTP API 로만 연결) 타입을 각자 유지한다.
 */

export type FloorId = 2 | 3;

export interface BoothPosition {
  x: number;
  y: number;
}

export interface Booth {
  id: string;
  name: string;
  team: string;
  floor: FloorId;
  amount: number;
  place?: string;
  position: BoothPosition;
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
