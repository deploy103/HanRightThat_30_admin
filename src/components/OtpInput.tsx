import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const LENGTH = 6;

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** 6자리가 모두 채워졌을 때 자동 제출용 */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

/**
 * 6칸 OTP 입력.
 *
 * 화면은 칸을 나눠 보여 주지만 각 칸이 실제 <input> 이라 스크린리더/모바일 키패드가 정상 동작하고,
 * 붙여넣기 한 번으로 6자리를 모두 채울 수 있다. 검증은 전적으로 서버가 한다 — 여기서는 형식만 맞춘다.
 */
export function OtpInput({ value, onChange, onComplete, disabled, autoFocus, label = '인증번호' }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setDigits(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(digits);
    if (digits.length === LENGTH) onComplete?.(digits);
    return digits;
  }

  function handleInput(index: number, raw: string) {
    // 한 칸에 여러 글자가 들어오면(자동완성/붙여넣기) 그 자리부터 채운다.
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      if (raw === '') setDigits(value.slice(0, index));
      return;
    }
    const merged = (value.slice(0, index) + digits).slice(0, LENGTH);
    const applied = setDigits(merged.padEnd(Math.min(value.length, LENGTH), ''));
    const nextIndex = Math.min(applied.length, LENGTH - 1);
    refs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (value[index]) setDigits(value.slice(0, index));
      else if (index > 0) {
        setDigits(value.slice(0, index - 1));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const applied = setDigits(event.clipboardData.getData('text'));
    refs.current[Math.min(applied.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className="otp-input" role="group" aria-label={`${label} ${LENGTH}자리`}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className={`otp-cell${value[index] ? ' is-filled' : ''}`}
          type="text"
          inputMode="numeric"
          // 문자 메시지/인증 앱 자동완성이 동작하도록 표준 토큰을 쓴다.
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={LENGTH}
          value={value[index] ?? ''}
          disabled={disabled}
          aria-label={`${label} ${index + 1}번째 자리`}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
