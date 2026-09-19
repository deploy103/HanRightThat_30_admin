import { useRef, useState } from 'react';
import { API_URL, api, ApiError } from '../lib/api';

/** 서버(server/assets.ts)가 받아 주는 형식과 같아야 한다. svg 는 스크립트를 품을 수 있어 제외한다. */
const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 4 * 1024 * 1024;

interface Props {
  imagePath: string;
  imageAlt: string;
  /** 대체 텍스트가 비어 있을 때 자동으로 채워 넣을 기본값 (보통 부스명). */
  altFallback?: string;
  onChange: (next: { imagePath: string; imageAlt: string }) => void;
}

/**
 * 부스 대표 이미지 업로드 · 미리보기 · 변경 · 삭제.
 *
 * 파일은 공개 API 서버로 바로 올라가고, 서버가 파일명을 새로 만들어 돌려준다.
 * 브라우저에서 하는 확장자/용량 확인은 편의용일 뿐이며, 실제 검증(MIME·매직 넘버·용량·경로)은 서버가 한다.
 */
export function BoothImageField({ imagePath, imageAlt, altFallback, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('PNG · JPG · WebP 이미지만 올릴 수 있습니다.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('이미지는 4MB 이하만 올릴 수 있습니다.');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await api.uploadBoothImage(file);
      setBroken(false);
      onChange({
        imagePath: uploaded.imagePath,
        // 대체 텍스트는 필수다 — 비어 있으면 부스명으로 채워 두고 필요하면 고치게 한다.
        imageAlt: imageAlt || (altFallback ? `${altFallback} 대표 이미지` : ''),
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '이미지를 올리지 못했습니다.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeImage() {
    // 부스에서 연결만 끊는다. 파일 자체 삭제는 아래 "파일도 삭제" 버튼에서 따로 한다.
    setBroken(false);
    onChange({ imagePath: '', imageAlt: '' });
  }

  async function deleteFile() {
    if (!imagePath) return;
    setError(null);
    setUploading(true);
    try {
      await api.deleteBoothImage(imagePath);
      setBroken(false);
      onChange({ imagePath: '', imageAlt: '' });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '이미지를 지우지 못했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-field">
      <span className="image-field-label">대표 이미지</span>

      <div className="image-field-body">
        <div className="image-preview">
          {imagePath && !broken ? (
            <img src={`${API_URL}${imagePath}`} alt={imageAlt || '부스 대표 이미지 미리보기'} onError={() => setBroken(true)} />
          ) : (
            <div className="image-preview-empty">{broken ? '이미지를 불러올 수 없음' : '이미지 없음'}</div>
          )}
        </div>

        <div className="image-field-controls">
          <input
            ref={inputRef}
            id="booth-image-file"
            type="file"
            accept={ACCEPT}
            className="sr-only-file"
            disabled={uploading}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? '올리는 중…' : imagePath ? '이미지 변경' : '이미지 업로드'}
            </button>
            {imagePath ? (
              <>
                <button type="button" className="btn btn-sm" disabled={uploading} onClick={removeImage}>
                  연결 해제
                </button>
                <button type="button" className="btn btn-sm btn-danger" disabled={uploading} onClick={() => void deleteFile()}>
                  파일도 삭제
                </button>
              </>
            ) : null}
          </div>
          <p className="field-hint">PNG · JPG · WebP, 최대 4MB. 올린 사진은 소개 페이지 부스 카드에 표시됩니다.</p>

          {imagePath ? (
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="booth-image-alt">이미지 설명 (필수 · 화면 낭독기와 이미지 로딩 실패 시 사용)</label>
              <input
                id="booth-image-alt"
                value={imageAlt}
                maxLength={200}
                onChange={(event) => onChange({ imagePath, imageAlt: event.target.value })}
                required
              />
            </div>
          ) : null}

          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
