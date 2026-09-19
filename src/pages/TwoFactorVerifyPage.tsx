import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { OtpInput } from '../components/OtpInput';
import { useAuthContext } from '../hooks/AuthContext';
import { api, ApiError } from '../lib/api';

/**
 * 로그인 2단계 — 인증 앱의 6자리 코드를 확인한다.
 * 코드 검증은 전적으로 서버가 하며, 성공해야만 서버가 정식 관리자 세션을 새로 발급한다.
 */
export function TwoFactorVerifyPage() {
  const { username, completeTwoFactor, logout } = useAuthContext();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<{ username: string; remaining: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(value: string) {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = useRecovery ? await api.twoFactorRecover(value) : await api.twoFactorVerify(value);
      if (result.usedRecoveryCode) {
        // 복구 코드를 썼다는 사실과 남은 개수는 그냥 지나치면 안 되는 정보라 한 번 멈춰서 알린다.
        setRecoveryNotice({ username: result.username, remaining: result.remainingRecoveryCodes });
        return;
      }
      completeTwoFactor(result.username);
      navigate('/', { replace: true });
    } catch (cause) {
      setCode('');
      setError(
        cause instanceof ApiError
          ? cause.message
          : '인증에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(useRecovery ? recoveryCode : code);
  }

  if (recoveryNotice) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1>복구 코드 사용됨</h1>
          <p className="lede">
            방금 사용한 복구 코드는 폐기되었습니다. 남은 복구 코드는 <b>{recoveryNotice.remaining}개</b>입니다.
          </p>
          {recoveryNotice.remaining <= 2 ? (
            <div className="notice-banner">
              복구 코드가 거의 없습니다. 인증 앱을 잃어버렸다면 서버에서 2단계 인증을 초기화한 뒤 다시 등록해 주세요.
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => {
              completeTwoFactor(recoveryNotice.username);
              navigate('/', { replace: true });
            }}
          >
            관리자 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>2단계 인증</h1>
        <p className="lede">
          {username ? <b>{username}</b> : null} 계정의 인증 앱에 표시된 6자리 코드를 입력하세요.
        </p>

        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        {useRecovery ? (
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="recovery-code">복구 코드</label>
            <input
              id="recovery-code"
              className="recovery-input"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              placeholder="ABCDE-FGHJK"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              required
              autoFocus
            />
            <p className="field-hint">2단계 인증 설정 시 받은 일회용 코드입니다. 한 번 쓰면 다시 사용할 수 없습니다.</p>
          </div>
        ) : (
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="otp-0">인증번호</label>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(value) => void submit(value)}
              disabled={submitting}
              autoFocus
            />
            <p className="field-hint">코드는 30초마다 바뀝니다. 실패하면 다음 코드로 다시 시도해 주세요.</p>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={submitting || (useRecovery ? recoveryCode.trim() === '' : code.length !== 6)}
        >
          {submitting ? '확인 중…' : '확인'}
        </button>

        <div className="login-links">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setUseRecovery((value) => !value);
              setError(null);
              setCode('');
              setRecoveryCode('');
            }}
          >
            {useRecovery ? '인증 앱 코드로 입력' : '인증 앱을 쓸 수 없나요? 복구 코드 사용'}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }));
            }}
          >
            다른 계정으로 로그인
          </button>
        </div>
      </form>
    </div>
  );
}
