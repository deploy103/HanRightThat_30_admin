import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/AuthContext';
import { ApiError } from '../lib/api';

/** 2FA 다음 단계에 대응하는 경로. */
const NEXT_PATH = { setup: '/two-factor/setup', verify: '/two-factor' } as const;

export function LoginPage() {
  const { authenticated, next, login } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 이미 인증이 끝났거나, 새로고침으로 돌아왔는데 2FA 단계가 남아 있으면 해당 화면으로 보낸다.
  useEffect(() => {
    if (authenticated) navigate('/', { replace: true });
    else if (next) navigate(NEXT_PATH[next], { replace: true });
  }, [authenticated, next, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await login(form.username, form.password);
      // 비밀번호만 맞았다고 관리자 화면으로 보내지 않는다 — 항상 2단계 인증을 거친다.
      navigate(session.next ? NEXT_PATH[session.next] : '/', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>한빛제 관리자</h1>
        <p className="lede">운영자 계정으로 로그인하세요.</p>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="username">아이디</label>
          <input
            id="username"
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm((f) => ({ ...f, username: event.target.value }))}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
        <p className="field-hint" style={{ marginTop: 14, textAlign: 'center' }}>
          로그인 후 인증 앱의 6자리 코드를 한 번 더 확인합니다.
        </p>
      </form>
    </div>
  );
}
