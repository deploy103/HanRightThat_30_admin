import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { OtpInput } from '../components/OtpInput';
import { useAuthContext } from '../hooks/AuthContext';
import { api, ApiError } from '../lib/api';
import type { TwoFactorSetupResponse } from '../types';

/**
 * 2단계 인증 최초 등록.
 *
 * QR 을 보여 준 것만으로 활성화하지 않는다 — 인증 앱이 만든 코드를 서버가 확인해야
 * 비로소 2FA 가 켜지고, 그때 복구 코드를 1회 발급한다.
 * secret 은 이 화면을 벗어나면 다시 볼 수 없고 localStorage 등 어디에도 저장하지 않는다.
 */
export function TwoFactorSetupPage() {
  const { username, completeTwoFactor, logout } = useAuthContext();
  const navigate = useNavigate();
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [enabledFor, setEnabledFor] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .twoFactorSetup()
      .then((result) => {
        if (!cancelled) setSetup(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(cause instanceof ApiError ? cause.message : 'QR 코드를 불러오지 못했습니다.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(value: string) {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.twoFactorEnable(value);
      // 여기서 completeTwoFactor 를 부르면 라우트 가드가 곧바로 대시보드로 보내 버려
      // 딱 한 번 보여 줘야 하는 복구 코드를 놓친다. 승격은 "이동" 버튼에서 한다.
      setRecoveryCodes(result.recoveryCodes);
      setEnabledFor(result.username);
    } catch (cause) {
      setCode('');
      setError(cause instanceof ApiError ? cause.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(code);
  }

  function downloadRecoveryCodes() {
    if (!recoveryCodes) return;
    const text = [
      '한빛제 관리자 2단계 인증 복구 코드',
      `계정: ${username ?? ''}`,
      `발급일: ${new Date().toLocaleString('ko-KR')}`,
      '',
      '각 코드는 한 번만 사용할 수 있습니다. 안전한 곳에 보관하세요.',
      '',
      ...recoveryCodes,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'hanbit-admin-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // --- 3단계: 복구 코드 안내 (등록 완료 후 1회) ---
  if (recoveryCodes) {
    return (
      <div className="login-shell">
        <div className="login-card login-card-wide">
          <h1>복구 코드</h1>
          <p className="lede">
            휴대폰을 잃어버렸을 때 로그인할 수 있는 일회용 코드입니다. <b>지금 한 번만 표시됩니다.</b>
          </p>

          <ul className="recovery-code-list">
            {recoveryCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="actions-row" style={{ marginBottom: 16 }}>
            <button type="button" className="btn" onClick={downloadRecoveryCodes}>
              텍스트 파일로 저장
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void navigator.clipboard?.writeText(recoveryCodes.join('\n')).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? '복사됨' : '모두 복사'}
            </button>
          </div>

          <div className="field-checkbox" style={{ marginTop: 0, marginBottom: 16 }}>
            <input
              id="ack-recovery"
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <label htmlFor="ack-recovery">안전한 곳에 보관했습니다.</label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!acknowledged}
            onClick={() => {
              if (enabledFor) completeTwoFactor(enabledFor);
              navigate('/', { replace: true });
            }}
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // --- 1~2단계: QR 스캔 → 코드 확인 ---
  return (
    <div className="login-shell">
      <form className="login-card login-card-wide" onSubmit={handleSubmit}>
        <h1>2단계 인증 설정</h1>
        <p className="lede">
          보안을 위해 관리자 계정에는 2단계 인증이 필요합니다. 인증 앱으로 아래 QR을 스캔한 뒤 코드를 입력하세요.
        </p>

        {loadError ? (
          <div className="error-banner" role="alert">
            {loadError}
          </div>
        ) : null}
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        {setup ? (
          <>
            <ol className="setup-steps">
              <li>
                Google Authenticator · Microsoft Authenticator · 1Password · Authy 등 인증 앱을 설치합니다.
              </li>
              <li>앱에서 “계정 추가 → QR 스캔”을 눌러 아래 코드를 스캔합니다.</li>
              <li>앱에 표시된 6자리 숫자를 입력합니다.</li>
            </ol>

            <div className="qr-box">
              {/* 서버가 만든 data: URL 이미지. QR 안에 secret 이 들어 있으므로 화면 밖으로 새지 않게 주의. */}
              <img src={setup.qrDataUrl} alt="2단계 인증 등록용 QR 코드" width={192} height={192} />
              <div className="qr-manual">
                <p className="field-hint">QR을 스캔할 수 없다면 아래 키를 직접 입력하세요.</p>
                <code className={`secret-key${showSecret ? '' : ' is-masked'}`}>
                  {showSecret ? setup.secret.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• •••• ••••'}
                </code>
                <div className="actions-row">
                  <button type="button" className="btn btn-sm" onClick={() => setShowSecret((value) => !value)}>
                    {showSecret ? '숨기기' : '키 보기'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(setup.secret).then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                  >
                    {copied ? '복사됨' : '키 복사'}
                  </button>
                </div>
                <p className="field-hint">
                  계정 이름: <b>{setup.issuer}</b> · 알고리즘 SHA1 · 6자리 · 30초
                </p>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="otp-0">앱에 표시된 인증번호</label>
              <OtpInput value={code} onChange={setCode} onComplete={(value) => void submit(value)} disabled={submitting} />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={submitting || code.length !== 6}
            >
              {submitting ? '확인 중…' : '2단계 인증 켜기'}
            </button>
          </>
        ) : loadError ? null : (
          <p className="empty">QR 코드를 만드는 중…</p>
        )}

        <div className="login-links">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }));
            }}
          >
            취소하고 로그아웃
          </button>
        </div>
      </form>
    </div>
  );
}
