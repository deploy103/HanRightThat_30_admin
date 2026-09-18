import type { LandingContent } from '../types';

interface Props {
  content: LandingContent;
  viewport: 'desktop' | 'mobile';
  isDraftPreview: boolean;
}

function formatPeriodPreview(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return '일정 준비 중';
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return '일정 준비 중';
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const startText = fmt.format(start);
  if (!endsAt) return startText;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return startText;
  return `${startText} ~ ${fmt.format(end)}`;
}

/**
 * 공개 소개 페이지(HanRightThat_30 src/landing/*)의 섹션 순서·색·주요 글자 크기를 간략히 맞춘
 * 관리자 전용 미리보기다. 폼 값만 그리며 부스·공연·일정·공지 같은 서버 데이터는 포함하지 않는다 —
 * 그 데이터는 항상 "현재 서버에 저장된 값"이라는 점을 아래 안내로 명확히 한다.
 * 공개 API로는 절대 전송하지 않으며, ?preview= 같은 공개 쿼리도 쓰지 않는다.
 */
export function LandingPreview({ content, viewport, isDraftPreview }: Props) {
  const period = formatPeriodPreview(content.startsAt, content.endsAt);
  const infoRows = [
    ['참여 대상', content.audienceInfo],
    ['입장 안내', content.admissionInfo],
    ['결제 안내', content.paymentInfo],
    ['운영 시간', content.operatingHoursInfo],
    ['문의', content.contactInfo],
  ].filter(([, value]) => value.trim() !== '');

  return (
    <div className={`landing-preview-frame landing-preview-${viewport}`}>
      <div className="landing-preview-badge">{isDraftPreview ? '저장 전 미리보기 (초안)' : '초안 미리보기'}</div>
      <div className="landing-preview-scroll">
        <header className="lp-hero">
          <span className="lp-eyebrow">
            {content.year} · 제{content.edition}회 {content.festivalName}
          </span>
          <h1 className="lp-title">{content.heroTitle || '(첫 화면 제목 없음)'}</h1>
          <p className="lp-theme">
            주제 <b>{content.theme || '-'}</b>
          </p>
          {content.heroDescription ? <p className="lp-lede">{content.heroDescription}</p> : null}
          <div className="lp-facts">
            <span>{period}</span>
            <span>{content.venueName || '장소 준비 중'}</span>
          </div>
          <div className="lp-actions">
            <span className="lp-btn-primary">축제 들어가기</span>
            <span className="lp-btn-secondary">공연 순서 보기</span>
          </div>
        </header>

        <section className="lp-section">
          <p className="lp-eyebrow-sm">축제 소개</p>
          {content.themeTitle || content.themeBody ? (
            <>
              {content.themeTitle ? <h2 className="lp-h2">{content.themeTitle}</h2> : null}
              {content.themeBody ? <p className="lp-body">{content.themeBody}</p> : null}
            </>
          ) : (
            <p className="lp-empty">주제 소개 문구를 준비하고 있습니다.</p>
          )}
        </section>

        <section className="lp-section lp-section-alt">
          <p className="lp-eyebrow-sm">부스 / 공연 / 전체 일정 / 공지</p>
          <p className="lp-empty">
            이 구역은 현재 서버에 저장된 실제 데이터(부스·공연·일정·공지)를 그대로 보여줍니다 — 이 미리보기에는
            포함하지 않습니다. 최종 화면은 공개 소개 페이지에서 확인하세요.
          </p>
        </section>

        <section className="lp-section">
          <p className="lp-eyebrow-sm">이용 안내</p>
          {(content.venueName || content.address || content.directionsUrl) ? (
            <div className="lp-venue">
              {content.venueName ? <p className="lp-venue-name">{content.venueName}</p> : null}
              {content.address ? <p className="lp-venue-address">{content.address}</p> : null}
              {content.directionsUrl ? <p className="lp-venue-link">지도 앱에서 열기 ↗</p> : null}
            </div>
          ) : null}
          {infoRows.length === 0 ? (
            <p className="lp-empty">이용 안내를 준비하고 있습니다.</p>
          ) : (
            <dl className="lp-info-grid">
              {infoRows.map(([label, value]) => (
                <div key={label} className="lp-info-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {content.faqItems.length > 0 ? (
            <div className="lp-faq">
              <h3 className="lp-h3">자주 묻는 질문</h3>
              {content.faqItems.map((item) => (
                <div key={item.id} className="lp-faq-item">
                  <p className="lp-faq-q">{item.question}</p>
                  <p className="lp-faq-a">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <footer className="lp-footer">
          <span>{content.festivalName}</span>
          {content.organizerText ? <span>주최 · {content.organizerText}</span> : null}
        </footer>
      </div>
    </div>
  );
}
