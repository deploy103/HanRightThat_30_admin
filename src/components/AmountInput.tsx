import { useState } from 'react';

interface Props {
  id: string;
  value: number;
  onChange: (value: number) => void;
}

/**
 * 모금액 입력칸. 시작 준비금 때문에 -100000 처럼 음수도 넣을 수 있어야 한다.
 * number input 을 숫자 상태에 바로 묶으면 "-" 만 친 순간 값이 ""(=0) 이 되어 0 으로 덮이므로,
 * 입력 중인 글자는 따로 들고 있다가 숫자가 완성될 때만 부모에 알린다.
 */
export function AmountInput({ id, value, onChange }: Props) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);

  // 다른 부스를 편집하는 등 바깥에서 값이 바뀌면 입력칸도 맞춘다.
  if (value !== synced) {
    setSynced(value);
    setText(String(value));
  }

  return (
    <input
      id={id}
      type="number"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const num = Number(next);
        if (next !== '' && Number.isFinite(num)) {
          setSynced(num);
          onChange(num);
        }
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
