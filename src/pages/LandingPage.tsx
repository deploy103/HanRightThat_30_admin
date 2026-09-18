import { useEffect, useMemo, useState } from 'react';
import { API_URL, api, ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { isoToSeoulInputValue, seoulInputValueToIso } from '../lib/datetimeSeoul';
import { hasAnyError, validateLandingContent, type FaqFieldErrors, type LandingFieldErrors } from '../lib/landingValidation';
import { useNavigationGuard } from '../hooks/NavigationGuard';
import type { FaqItem, LandingContent, LandingState } from '../types';
import { LandingPreview } from './LandingPreview';

function newFaqId(): string {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Banner = { tone: 'success' | 'error' | 'info'; text: string } | null;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? <p className="field-hint">{hint}</p> : null}
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LandingPage() {
  const { setDirty } = useNavigationGuard();

  const [landing, setLanding] = useState<LandingState | null>(null);
  const [baseline, setBaseline] = useState<LandingContent | null>(null);
  const [form, setForm] = useState<LandingContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [conflict, setConflict] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  async function load() {
    try {
      const state = await api.getLanding();
      setLanding(state);
      setForm(state.draft);
      setBaseline(state.draft);
      setConflict(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        setApiUnavailable(true);
        return;
      }
      setLoadError(cause instanceof ApiError ? cause.message : '소개 콘텐츠를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dirty = useMemo(() => {
    if (!form || !baseline) return false;
    return JSON.stringify(form) !== JSON.stringify(baseline);
  }, [form, baseline]);

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  const { fieldErrors, faqErrors } = useMemo<{ fieldErrors: LandingFieldErrors; faqErrors: FaqFieldErrors }>(
    () => (form ? validateLandingContent(form) : { fieldErrors: {}, faqErrors: {} }),
    [form],
  );

  function updateForm(patch: Partial<LandingContent>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  function updateFaq(id: string, patch: Partial<FaqItem>) {
    updateForm({
      faqItems: (form?.faqItems ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addFaq() {
    if (!form) return;
    if (form.faqItems.length >= 20) {
      setBanner({ tone: 'error', text: 'FAQ는 최대 20개까지만 등록할 수 있습니다.' });
      return;
    }
    updateForm({ faqItems: [...form.faqItems, { id: newFaqId(), question: '', answer: '' }] });
  }

  function removeFaq(id: string) {
    if (!window.confirm('이 FAQ 항목을 삭제하시겠습니까?')) return;
    updateForm({ faqItems: (form?.faqItems ?? []).filter((item) => item.id !== id) });
  }

  function moveFaq(index: number, direction: -1 | 1) {
    if (!form) return;
    const target = index + direction;
    if (target < 0 || target >= form.faqItems.length) return;
    const next = [...form.faqItems];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    updateForm({ faqItems: next });
  }

  async function handleSaveDraft() {
    if (!form || !landing || saving) return;
    setAttempted(true);
    const { fieldErrors: errs, faqErrors: faqErrs } = validateLandingContent(form);
    if (hasAnyError(errs, faqErrs)) {
      setBanner({ tone: 'error', text: '입력값을 확인해 주세요. 오류가 있는 항목이 빨갛게 표시됩니다.' });
      return;
    }

    setSaving(true);
    setBanner(null);
    try {
      const next = await api.saveLandingDraft(landing.revision, form);
      setLanding(next);
      setForm(next.draft);
      setBaseline(next.draft);
      setLastSavedAt(new Date().toISOString());
      setConflict(false);
      setBanner({ tone: 'success', text: '초안을 저장했습니다. 공개 소개에는 아직 반영되지 않았습니다.' });
    } catch (cause) {
      handleSaveOrPublishError(cause, 'save');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!landing || publishing) return;
    if (dirty) {
      setBanner({ tone: 'error', text: '먼저 초안을 저장해 주세요.' });
      return;
    }
    if (
      !window.confirm('현재 저장된 초안을 공개 사이트에 게시합니다. 게시 후에는 방문자에게 즉시 노출됩니다. 계속하시겠습니까?')
    ) {
      return;
    }

    setPublishing(true);
    setBanner(null);
    try {
      const next = await api.publishLanding(landing.revision);
      setLanding(next);
      setForm(next.draft);
      setBaseline(next.draft);
      setConflict(false);
      setBanner({ tone: 'success', text: '현재 내용이 공개 사이트에 반영되었습니다.' });
    } catch (cause) {
      handleSaveOrPublishError(cause, 'publish');
    } finally {
      setPublishing(false);
    }
  }

  function handleSaveOrPublishError(cause: unknown, action: 'save' | 'publish') {
    if (!(cause instanceof ApiError)) {
      setBanner({ tone: 'error', text: '네트워크 오류로 저장하지 못했습니다. 입력 내용은 그대로 남아 있습니다. 다시 시도해 주세요.' });
      return;
    }
    if (cause.status === 409) {
      setConflict(true);
      setBanner({
        tone: 'error',
        text:
          action === 'save'
            ? '다른 관리자나 다른 탭에서 먼저 저장했습니다. 지금 입력은 그대로 남아 있습니다. 아래에서 최신 내용을 다시 불러온 뒤 다시 저장해 주세요.'
            : '다른 곳에서 먼저 저장/게시해 최신 내용과 달라졌습니다. 최신 내용을 다시 불러온 뒤 다시 게시해 주세요.',
      });
      return;
    }
    if (cause.status === 401) {
      setBanner({ tone: 'error', text: '세션이 만료되었습니다. 지금 입력은 화면에 남아 있습니다 — 다시 로그인한 뒤 저장을 다시 시도해 주세요.' });
      return;
    }
    if (cause.status === 403) {
      setBanner({ tone: 'error', text: '권한이 없거나 요청 검증에 실패했습니다 (CSRF). 새로고침 후 다시 로그인해 주세요.' });
      return;
    }
    if (cause.status === 429) {
      setBanner({ tone: 'error', text: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    setBanner({ tone: 'error', text: cause.message });
  }

  async function reloadFromServer() {
    if (dirty && !window.confirm('지금 입력한 내용을 버리고 서버의 최신 내용을 다시 불러옵니다. 계속하시겠습니까?')) {
      return;
    }
    setBanner(null);
    await load();
  }

  if (apiUnavailable) {
    return (
      <>
        <div className="page-head">
          <h1>소개 페이지</h1>
        </div>
        <p className="empty">
          서버에 소개 API(<code>/api/admin/landing</code>)가 없습니다. HanRightThat_30 서버를 최신 버전으로 배포한
          뒤 이 메뉴를 다시 열어 주세요. 다른 관리 메뉴는 그대로 사용할 수 있습니다.
        </p>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <div className="page-head">
          <h1>소개 페이지</h1>
        </div>
        <div className="error-banner">{loadError}</div>
        <button type="button" className="btn btn-primary" onClick={() => void load()}>
          다시 시도
        </button>
      </>
    );
  }

  if (!form || !landing) {
    return (
      <>
        <div className="page-head">
          <h1>소개 페이지</h1>
        </div>
        <p className="empty">불러오는 중…</p>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>소개 페이지</h1>
        <a className="btn btn-sm" href={`${API_URL}/`} target="_blank" rel="noreferrer">
          공개 사이트 열기
        </a>
      </div>

      <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: -12, marginBottom: 16 }}>
        여기서 고친 내용은 <b>초안 저장</b>을 눌러야 서버에 저장되고, <b>게시</b>를 눌러야 공개 사이트에
        반영됩니다. 부스·공연·일정·공지는 각자의 메뉴에서 저장하는 즉시 반영되는 것과 다릅니다.
      </p>

      {banner ? (
        <div className={banner.tone === 'success' ? 'error-banner success-banner' : 'error-banner'} role="status">
          {banner.text}
        </div>
      ) : null}

      {conflict ? (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--hot)' }}>
          <button type="button" className="btn btn-sm" onClick={() => void reloadFromServer()}>
            최신 내용 다시 불러오기
          </button>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="actions-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>
            <div>
              현재 저장된 revision: <b style={{ color: 'var(--bone)' }}>{landing.revision}</b>
            </div>
            <div>
              마지막 서버 저장 시각: {lastSavedAt ? formatDateTime(lastSavedAt) : '이번 접속에서는 저장한 적 없음'}
            </div>
            <div>마지막 게시 시각: {landing.publishedAt ? formatDateTime(landing.publishedAt) : '게시된 적 없음'}</div>
            {dirty ? (
              <div style={{ color: 'var(--acid)', fontWeight: 700, marginTop: 4 }}>저장하지 않은 변경 사항이 있습니다.</div>
            ) : (
              <div style={{ marginTop: 4 }}>저장된 초안과 현재 입력이 같습니다.</div>
            )}
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={() => setPreviewOpen((v) => !v)}>
              {previewOpen ? '미리보기 닫기' : '미리보기'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void handleSaveDraft()} disabled={saving}>
              {saving ? '저장 중…' : '초안 저장'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handlePublish()}
              disabled={publishing || dirty}
              title={dirty ? '먼저 초안을 저장해 주세요' : undefined}
            >
              {publishing ? '게시 중…' : '게시'}
            </button>
          </div>
        </div>
        {dirty ? (
          <p style={{ margin: '10px 0 0', color: 'var(--dim)', fontSize: 12 }}>게시 버튼은 저장 후에 눌러야 활성화됩니다 — 먼저 초안을 저장해 주세요.</p>
        ) : null}
      </div>

      {previewOpen ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="actions-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-sm${previewViewport === 'desktop' ? ' btn-primary' : ''}`}
              onClick={() => setPreviewViewport('desktop')}
            >
              데스크톱
            </button>
            <button
              type="button"
              className={`btn btn-sm${previewViewport === 'mobile' ? ' btn-primary' : ''}`}
              onClick={() => setPreviewViewport('mobile')}
            >
              모바일
            </button>
          </div>
          <LandingPreview content={form} viewport={previewViewport} isDraftPreview={dirty} />
        </div>
      ) : null}

      <form
        className="card"
        style={{ marginBottom: 20 }}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveDraft();
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>1. 기본 정보</h2>
        <div className="form-grid">
          <Field id="ld-name" label="행사명 (회차 제외)" hint="예: 한빛제 — '제30회'는 아래 회차 필드로 따로 관리합니다." error={attempted ? fieldErrors.festivalName : undefined}>
            <input id="ld-name" value={form.festivalName} onChange={(e) => updateForm({ festivalName: e.target.value })} required />
          </Field>
          <Field id="ld-edition" label="회차" error={attempted ? fieldErrors.edition : undefined}>
            <input
              id="ld-edition"
              type="number"
              min={1}
              value={form.edition}
              onChange={(e) => updateForm({ edition: Number(e.target.value) })}
            />
          </Field>
          <Field id="ld-year" label="연도" error={attempted ? fieldErrors.year : undefined}>
            <input id="ld-year" type="number" value={form.year} onChange={(e) => updateForm({ year: Number(e.target.value) })} />
          </Field>
          <Field id="ld-theme" label="주제" hint='기본값 "소리"' error={attempted ? fieldErrors.theme : undefined}>
            <input id="ld-theme" value={form.theme} onChange={(e) => updateForm({ theme: e.target.value })} required />
          </Field>
        </div>

        <h2 style={{ fontSize: 16, margin: '24px 0 4px' }}>2. 첫 화면 문구</h2>
        <div className="form-grid">
          <Field id="ld-hero-title" label="첫 화면 제목" error={attempted ? fieldErrors.heroTitle : undefined}>
            <input id="ld-hero-title" value={form.heroTitle} onChange={(e) => updateForm({ heroTitle: e.target.value })} required />
          </Field>
          <Field id="ld-starts" label="시작 일시" hint="비워 두면 공개 화면에 '일정 준비 중'으로 표시됩니다.">
            <input
              id="ld-starts"
              type="datetime-local"
              value={isoToSeoulInputValue(form.startsAt)}
              onChange={(e) => updateForm({ startsAt: seoulInputValueToIso(e.target.value) })}
            />
          </Field>
          <Field id="ld-ends" label="종료 일시" error={attempted ? fieldErrors.endsAt : undefined}>
            <input
              id="ld-ends"
              type="datetime-local"
              value={isoToSeoulInputValue(form.endsAt)}
              onChange={(e) => updateForm({ endsAt: seoulInputValueToIso(e.target.value) })}
            />
          </Field>
          <Field id="ld-venue" label="장소명" error={attempted ? fieldErrors.venueName : undefined}>
            <input id="ld-venue" value={form.venueName} onChange={(e) => updateForm({ venueName: e.target.value })} />
          </Field>
          <Field id="ld-address" label="주소" error={attempted ? fieldErrors.address : undefined}>
            <input id="ld-address" value={form.address} onChange={(e) => updateForm({ address: e.target.value })} />
          </Field>
          <Field id="ld-directions" label="외부 지도 링크 (선택)" hint="https:// 로 시작하는 URL만 입력할 수 있습니다." error={attempted ? fieldErrors.directionsUrl : undefined}>
            <input
              id="ld-directions"
              value={form.directionsUrl}
              placeholder="https://map.naver.com/..."
              onChange={(e) => updateForm({ directionsUrl: e.target.value })}
            />
          </Field>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ld-hero-desc">첫 화면 소개 문구</label>
          <textarea id="ld-hero-desc" rows={2} value={form.heroDescription} onChange={(e) => updateForm({ heroDescription: e.target.value })} />
          {attempted && fieldErrors.heroDescription ? <p className="field-error">{fieldErrors.heroDescription}</p> : null}
        </div>

        <h2 style={{ fontSize: 16, margin: '24px 0 4px' }}>3. 주제 소개</h2>
        <div className="field">
          <label htmlFor="ld-theme-title">제목</label>
          <input id="ld-theme-title" value={form.themeTitle} onChange={(e) => updateForm({ themeTitle: e.target.value })} />
          {attempted && fieldErrors.themeTitle ? <p className="field-error">{fieldErrors.themeTitle}</p> : null}
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ld-theme-body">본문</label>
          <p className="field-hint">아직 공식 슬로건으로 확정되지 않았다면 초안 문구임을 알 수 있게 작성해 주세요.</p>
          <textarea id="ld-theme-body" rows={4} value={form.themeBody} onChange={(e) => updateForm({ themeBody: e.target.value })} />
          {attempted && fieldErrors.themeBody ? <p className="field-error">{fieldErrors.themeBody}</p> : null}
        </div>

        <h2 style={{ fontSize: 16, margin: '24px 0 4px' }}>4. 이용 안내</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--dim)', fontSize: 12 }}>
          확정되지 않은 무료 입장·외부인 입장·결제 방식·주차 가능 여부는 사실처럼 적지 말고, 비워 두거나
          "준비 중"이라고 적어 주세요.
        </p>
        <div className="field">
          <label htmlFor="ld-audience">참여 대상</label>
          <textarea id="ld-audience" rows={2} value={form.audienceInfo} onChange={(e) => updateForm({ audienceInfo: e.target.value })} />
          {attempted && fieldErrors.audienceInfo ? <p className="field-error">{fieldErrors.audienceInfo}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="ld-admission">입장 안내</label>
          <textarea id="ld-admission" rows={2} value={form.admissionInfo} onChange={(e) => updateForm({ admissionInfo: e.target.value })} />
          {attempted && fieldErrors.admissionInfo ? <p className="field-error">{fieldErrors.admissionInfo}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="ld-payment">결제 안내</label>
          <textarea id="ld-payment" rows={2} value={form.paymentInfo} onChange={(e) => updateForm({ paymentInfo: e.target.value })} />
          {attempted && fieldErrors.paymentInfo ? <p className="field-error">{fieldErrors.paymentInfo}</p> : null}
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ld-hours">운영 시간 설명</label>
          <textarea id="ld-hours" rows={2} value={form.operatingHoursInfo} onChange={(e) => updateForm({ operatingHoursInfo: e.target.value })} />
          {attempted && fieldErrors.operatingHoursInfo ? <p className="field-error">{fieldErrors.operatingHoursInfo}</p> : null}
        </div>

        <h2 style={{ fontSize: 16, margin: '24px 0 4px' }}>5. FAQ</h2>
        {attempted && fieldErrors.faqItems ? <p className="field-error">{fieldErrors.faqItems}</p> : null}
        {form.faqItems.length === 0 ? <p className="empty">등록된 FAQ가 없습니다.</p> : null}
        {form.faqItems.map((item, index) => (
          <div key={item.id} className="faq-editor-item">
            <div className="field">
              <label htmlFor={`faq-q-${item.id}`}>질문 {index + 1}</label>
              <input
                id={`faq-q-${item.id}`}
                value={item.question}
                onChange={(e) => updateFaq(item.id, { question: e.target.value })}
              />
              {attempted && faqErrors[item.id]?.question ? <p className="field-error">{faqErrors[item.id].question}</p> : null}
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor={`faq-a-${item.id}`}>답변</label>
              <textarea
                id={`faq-a-${item.id}`}
                rows={2}
                value={item.answer}
                onChange={(e) => updateFaq(item.id, { answer: e.target.value })}
              />
              {attempted && faqErrors[item.id]?.answer ? <p className="field-error">{faqErrors[item.id].answer}</p> : null}
            </div>
            <div className="actions-row">
              <button type="button" className="btn btn-sm" onClick={() => moveFaq(index, -1)} disabled={index === 0}>
                위로
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => moveFaq(index, 1)}
                disabled={index === form.faqItems.length - 1}
              >
                아래로
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeFaq(item.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={addFaq} style={{ marginTop: form.faqItems.length > 0 ? 12 : 0 }}>
          + FAQ 추가
        </button>

        <h2 style={{ fontSize: 16, margin: '24px 0 4px' }}>6. 주최 · 문의 · 제작진</h2>
        <div className="field">
          <label htmlFor="ld-organizer">주최 표기</label>
          <input id="ld-organizer" value={form.organizerText} onChange={(e) => updateForm({ organizerText: e.target.value })} />
          {attempted && fieldErrors.organizerText ? <p className="field-error">{fieldErrors.organizerText}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="ld-contact">문의 안내</label>
          <textarea id="ld-contact" rows={2} value={form.contactInfo} onChange={(e) => updateForm({ contactInfo: e.target.value })} />
          {attempted && fieldErrors.contactInfo ? <p className="field-error">{fieldErrors.contactInfo}</p> : null}
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ld-credits">제작진 표기 (선택)</label>
          <input id="ld-credits" value={form.creditsText} onChange={(e) => updateForm({ creditsText: e.target.value })} />
          {attempted && fieldErrors.creditsText ? <p className="field-error">{fieldErrors.creditsText}</p> : null}
        </div>

        <div className="actions-row" style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '저장 중…' : '초안 저장'}
          </button>
        </div>
      </form>
    </>
  );
}
