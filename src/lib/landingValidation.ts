import type { LandingContent } from '../types';

export type LandingFieldErrors = Partial<Record<keyof LandingContent, string>>;
export type FaqFieldErrors = Record<string, { question?: string; answer?: string }>;

const HTTPS_URL_RE = /^https:\/\/\S+$/;

/**
 * HanRightThat_30 server/validate.ts의 parseLandingContent와 같은 규칙을 클라이언트에서도
 * 먼저 검사한다 — 저장 전 오류를 필드 옆에 바로 보여주기 위해서다. 서버 검증이 최종 기준이며
 * 이 함수는 UX 보조일 뿐이다.
 */
export function validateLandingContent(content: LandingContent): {
  fieldErrors: LandingFieldErrors;
  faqErrors: FaqFieldErrors;
} {
  const fieldErrors: LandingFieldErrors = {};
  const faqErrors: FaqFieldErrors = {};

  if (!content.festivalName.trim()) fieldErrors.festivalName = '행사명을 입력해 주세요.';
  else if (content.festivalName.length > 80) fieldErrors.festivalName = '행사명은 80자 이하로 입력해 주세요.';

  if (!Number.isInteger(content.edition) || content.edition <= 0) {
    fieldErrors.edition = '회차는 1 이상의 정수여야 합니다.';
  }
  if (!Number.isInteger(content.year) || content.year < 2000 || content.year > 2100) {
    fieldErrors.year = '연도는 2000~2100 사이의 정수여야 합니다.';
  }
  if (!content.theme.trim()) fieldErrors.theme = '주제를 입력해 주세요.';
  else if (content.theme.length > 80) fieldErrors.theme = '주제는 80자 이하로 입력해 주세요.';

  if (!content.heroTitle.trim()) fieldErrors.heroTitle = '첫 화면 제목을 입력해 주세요.';
  else if (content.heroTitle.length > 120) fieldErrors.heroTitle = '첫 화면 제목은 120자 이하로 입력해 주세요.';

  if (content.heroDescription.length > 500) fieldErrors.heroDescription = '첫 화면 소개는 500자 이하로 입력해 주세요.';
  if (content.venueName.length > 120) fieldErrors.venueName = '장소명은 120자 이하로 입력해 주세요.';
  if (content.address.length > 300) fieldErrors.address = '주소는 300자 이하로 입력해 주세요.';
  if (content.directionsUrl && !HTTPS_URL_RE.test(content.directionsUrl)) {
    fieldErrors.directionsUrl = 'https:// 로 시작하는 URL만 입력할 수 있습니다.';
  }
  if (content.themeTitle.length > 120) fieldErrors.themeTitle = '주제 소개 제목은 120자 이하로 입력해 주세요.';
  if (content.themeBody.length > 3000) fieldErrors.themeBody = '주제 소개 본문은 3000자 이하로 입력해 주세요.';
  if (content.audienceInfo.length > 1000) fieldErrors.audienceInfo = '참여 대상 안내는 1000자 이하로 입력해 주세요.';
  if (content.admissionInfo.length > 1000) fieldErrors.admissionInfo = '입장 안내는 1000자 이하로 입력해 주세요.';
  if (content.paymentInfo.length > 1000) fieldErrors.paymentInfo = '결제 안내는 1000자 이하로 입력해 주세요.';
  if (content.operatingHoursInfo.length > 1000) {
    fieldErrors.operatingHoursInfo = '운영 시간 안내는 1000자 이하로 입력해 주세요.';
  }
  if (content.contactInfo.length > 1000) fieldErrors.contactInfo = '문의 안내는 1000자 이하로 입력해 주세요.';
  if (content.organizerText.length > 300) fieldErrors.organizerText = '주최 표기는 300자 이하로 입력해 주세요.';
  if (content.creditsText.length > 300) fieldErrors.creditsText = '제작진 표기는 300자 이하로 입력해 주세요.';

  if (content.startsAt && content.endsAt) {
    if (new Date(content.endsAt).getTime() < new Date(content.startsAt).getTime()) {
      fieldErrors.endsAt = '종료 시각은 시작 시각 이후여야 합니다.';
    }
  }

  if (content.faqItems.length > 20) {
    fieldErrors.faqItems = 'FAQ는 최대 20개까지 등록할 수 있습니다.';
  }
  for (const item of content.faqItems) {
    const errors: { question?: string; answer?: string } = {};
    if (!item.question.trim()) errors.question = '질문을 입력해 주세요.';
    else if (item.question.length > 200) errors.question = '질문은 200자 이하로 입력해 주세요.';
    if (!item.answer.trim()) errors.answer = '답변을 입력해 주세요.';
    else if (item.answer.length > 2000) errors.answer = '답변은 2000자 이하로 입력해 주세요.';
    if (errors.question || errors.answer) faqErrors[item.id] = errors;
  }

  return { fieldErrors, faqErrors };
}

export function hasAnyError(fieldErrors: LandingFieldErrors, faqErrors: FaqFieldErrors): boolean {
  return Object.keys(fieldErrors).length > 0 || Object.keys(faqErrors).length > 0;
}
