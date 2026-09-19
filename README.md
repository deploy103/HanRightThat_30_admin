# 한빛제 관리자 대시보드 (HanRightThat_30_admin)

제30회 한빛제 공개 사이트([`HanRightThat_30`](../HanRightThat_30))의 데이터를 관리하는 관리자 웹앱이다.

**이 저장소에는 백엔드/DB 가 없다.** 브라우저에서 직접 `HanRightThat_30` 의 `/api/admin/*` 를
세션 쿠키로 호출하는 순수 정적 SPA(React + Vite)이고, nginx 로만 서빙한다. 두 저장소는 HTTP API 로만
연결되며 서로의 파일을 import 하거나 공유하지 않는다 — 타입도 [`src/types.ts`](./src/types.ts)에
이 저장소 자체적으로 다시 정의했다.

```
admin.hanwol.site --(nginx)--> 이 컨테이너 (정적 파일, 127.0.0.1:3100)
        |
        | fetch(credentials:'include', X-CSRF-Token)
        v
hanwol.site/api/admin/*  (HanRightThat_30 저장소가 서빙)
```

## 기능

- 로그인/로그아웃 (세션 쿠키 + **TOTP 2단계 인증** — 아래 "2단계 인증" 참고)
- **소개 페이지(`/landing`)**: 축제 소개 문구·일정·이용 안내·FAQ 편집, 초안 저장/미리보기/게시 분리
  (HANWOL-INTRO-V1 계약, 공개 저장소 요구사항2.md와 동일). 대시보드에 게시 여부·마지막 게시 시각 표시.
- 부스: 목록/추가/수정/보관(soft delete)/복원, 활성·공개 토글, 층/금액 입력, 소개 페이지용
  한 줄 소개/상세 설명, **대표 이미지 업로드**(미리보기·변경·삭제), "공개 위치 보기" 링크
- **부스 배치도(`/booth-map`)**: 학교 지도 위에서 마우스로 끌어 부스를 만들고, 옮기고, 크기를 바꾸는
  GUI 편집기. 좌표를 숫자로 입력하지 않는다 (아래 "부스 배치도 편집기" 참고)
- 공연 순서: CRUD + 순서 변경
- 축제 일정: CRUD
- 공지: CRUD + 게시/비공개 토글 (삭제 시 확인 모달)
- 순위 미리보기 + 공개/비공개 전환
- 감사로그 조회

## 개발 실행

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8787 (HanRightThat_30 개발 서버)
npm run dev             # http://localhost:5174
```

`HanRightThat_30` 을 `npm run dev` (포트 8787)로 먼저 띄워 둬야 로그인/데이터 조회가 된다.
로컬에서는 두 앱이 서로 다른 포트(호스트는 둘 다 `localhost`)라 쿠키의 `Domain` 속성 없이도
잘 동작한다 (쿠키는 포트를 구분하지 않는다).

**CORS 주의**: `HanRightThat_30` 은 `ADMIN_ORIGIN` 이 설정된 Origin 에서만 자격증명 포함 요청을
허용한다. 이 앱을 기본 포트(`5174`)로 로컬에서 띄운다면, `HanRightThat_30` 쪽을
`ADMIN_ORIGIN=http://localhost:5174 npm run dev` 로 띄워야 로그인/저장이 CORS에 막히지 않는다.

```bash
npm run lint
npm run typecheck
npm run build     # dist/ 생성, 프로덕션 정적 파일
npm run preview   # 빌드 결과 로컬 확인
```

## 관리자 계정 만들기

이 저장소에는 회원가입 화면이 없다. `HanRightThat_30` 쪽 CLI 로 만든다.

```bash
# HanRightThat_30 저장소에서
npm run create-admin -- --username admin
# 또는 운영 컨테이너 안에서
docker compose exec web node dist-server/server/createAdmin.js --username admin
```

**주의**: `HanRightThat_30` 서버가 이미 실행 중일 때 이 CLI를 함께 돌리면, 서버 프로세스가 들고 있는
캐시가 CLI가 방금 쓴 계정을 덮어써 조용히 유실될 수 있다(`HanRightThat_30/SECURITY_REVIEW.md` §3.1).
서버를 멈추고 실행하거나, 실행 직후 서버를 재시작한다.

## 환경변수

`.env.example` 참고. `VITE_API_URL` 은 **빌드 시점에 번들에 박히는 값**이라 API 도메인이 바뀌면
다시 빌드해야 한다 (`docker compose up -d --build`).

| 이름 | 예시 | 설명 |
|---|---|---|
| `VITE_API_URL` | `https://hanwol.site` | 브라우저가 직접 호출할 `HanRightThat_30` API 서버 주소 |

## public 과의 연결 방식

- 모든 요청은 `HanRightThat_30` 의 `/api/admin/*` 로만 나간다 (`src/lib/api.ts`).
- 세션 쿠키는 `credentials: 'include'` 로 자동 전송된다. 쿠키의 `Domain` 은 `HanRightThat_30` 쪽
  `COOKIE_DOMAIN` 환경변수(운영에서 `.hanwol.site`)가 결정한다 — 이 저장소는 쿠키를 직접 설정하지 않는다.
- 모든 변경 요청(POST/PUT/DELETE)에는 `document.cookie` 에서 읽은 CSRF 토큰을 `X-CSRF-Token` 헤더로
  함께 보낸다 (double-submit 패턴). 이 값은 로그인 시 서버가 non-HttpOnly 쿠키로 내려준다.
- 실제 인가 검사는 항상 `HanRightThat_30` 서버가 한다. 이 앱의 로그인 가드(`RequireAuth`)는 UX 편의일
  뿐이며, 세션이 없으면 어차피 API 가 401 을 반환한다.

## Docker

```bash
cp .env.example .env   # VITE_API_URL 설정
docker compose up -d --build
```

- `Dockerfile` 은 멀티스테이지: `node:20-alpine` 으로 빌드 → `nginx:alpine` 으로 정적 파일만 서빙.
- 컨테이너는 기본적으로 `127.0.0.1:3100` 에만 바인딩된다 — 외부에서는 반드시 리버스 프록시를 통해 접근한다.
- `nginx.conf` 는 컨테이너 **내부** nginx 설정(SPA fallback + 보안 헤더용)이고, [`deploy/nginx.conf.example`](./deploy/nginx.conf.example) 은
  호스트(또는 별도 리버스 프록시 서버)의 nginx 설정 예시다. 서로 다른 파일이니 혼동하지 말 것.

### 리버스 프록시가 별도 VM에 있는 경우 (같은 프라이빗 네트워크)

`HanRightThat_30` 과 마찬가지다: `.env` 의 `BIND_ADDR` 을 이 VM의 프라이빗 IP로 설정하고, 방화벽에서
리버스 프록시 서버의 IP만 3100 포트에 접근하도록 제한한 뒤, 그 프록시 서버에 등록하는
[`deploy/nginx.conf.example`](./deploy/nginx.conf.example) 의 `proxy_pass` 를 이 VM의 프라이빗 IP로 바꾼다.
자세한 이유/절차는 `HanRightThat_30` 저장소 README 의 "리버스 프록시가 별도 VM에 있는 경우" 항목 참고.
- `nginx.conf` 는 `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Content-Security-Policy`(검색엔진 색인
  방지용 `X-Robots-Tag` 포함)를 붙인다. **`VITE_API_URL` 을 `https://hanwol.site` 가 아닌 다른 도메인으로 바꾸면
  `nginx.conf` 의 CSP `connect-src` 도 그 도메인으로 함께 바꿔야 fetch 가 막히지 않는다.**
- `public/robots.txt` 로 전체 색인을 막는다 (관리자 화면이 검색엔진에 노출되지 않도록).

## Nginx (호스트 리버스 프록시)

[`deploy/nginx.conf.example`](./deploy/nginx.conf.example) 참고. `HanRightThat_30/deploy/nginx.conf.example`
과 함께 같은 nginx 인스턴스에 등록하면 된다 (`hanwol.site`/`www.hanwol.site` 는 한쪽, `admin.hanwol.site`
는 이쪽).

## DB migration / backup / restore

이 저장소에는 DB 가 없다. 데이터는 전부 `HanRightThat_30` 의 `data/festival.json`, `data/admin.json` 에
있으므로 백업/복구는 그 저장소의 README 를 참고한다 (파일 복사만으로 충분하다).

## 소개 페이지 운영 방법

1. 사이드바 "소개 페이지" 메뉴로 들어간다.
2. 기본 정보 · 첫 화면 문구 · 주제 소개 · 이용 안내 · FAQ · 주최/문의/제작진을 채운다.
   - "행사명" 필드에는 회차("제30회")를 넣지 않는다 — 회차/연도는 옆의 별도 필드로 관리하고, 화면에서
     자동으로 합쳐 보여준다.
   - 날짜·장소·입장/결제 방식이 아직 확정되지 않았으면 비워 두거나 "준비 중"이라고 적는다. 확정되지
     않은 정보를 사실처럼 적지 않는다.
   - 부스/공연/전체 일정/공지는 이 화면에서 편집하지 않는다 — 각자의 메뉴(부스 관리/공연 순서/축제
     일정/공지)에서 저장하면 즉시 공개 화면에 반영된다.
3. **초안 저장**을 누른다 — 아직 공개 사이트에는 반영되지 않는다.
4. **미리보기**로 데스크톱/모바일 모습을 확인한다(폼에 입력한 값 기준, 저장 여부와 무관하게 바로 보임).
5. 문제가 없으면 **게시**를 누른다 — 저장하지 않은 변경이 있으면 게시 버튼이 비활성화되니 먼저 저장한다.
   게시 확인창이 뜨고, 성공하면 "현재 내용이 공개 사이트에 반영되었습니다"가 표시된다.
6. 실제 공개 사이트(`공개 사이트 열기` 버튼, `https://hanwol.site/`)에서 최종 확인한다.

두 관리자가 동시에 저장하면 나중에 저장한 쪽이 409(충돌)를 받는다 — 화면의 입력은 그대로 남고,
"최신 내용 다시 불러오기"로 서버의 최신 초안을 받아온 뒤 다시 편집·저장한다.

## 배포 / 업데이트

권장 순서 (요구사항2.md §15):

1. `HanRightThat_30` 데이터 백업(`data/festival.json`, `data/admin.json`).
2. `HanRightThat_30` 서버를 새 버전(landing API/부스 선택 필드 포함)으로 먼저 배포한다.
   ```bash
   cd /opt/hanwol/HanRightThat_30 && git pull && docker compose up -d --build
   ```
3. 이 저장소(관리자)를 새 버전으로 배포한다.
   ```bash
   cd /opt/hanwol/HanRightThat_30_admin
   git pull
   docker compose up -d --build
   ```
4. 운영자가 로그인해 **2단계 인증을 등록**하고 복구 코드를 보관한다.
5. 소개 초안을 작성·검토·게시하고, 부스 배치도/사진/공지를 점검한다.
6. 공개 소개(`/`)와 현장 화면(`/play/*`, 특히 `/play/notice` 와 `/play/map`)을 실제로 열어 확인한다.

> 2FA/지도 편집기/이미지 업로드가 들어간 버전은 **`HanRightThat_30` 서버를 반드시 먼저** 올려야 한다.
> 서버가 구버전이면 이 앱의 로그인이 2단계로 넘어가지 못한다.

`HanRightThat_30` 재배포와 완전히 독립적이다 — 이 저장소만 다시 배포해도 public 사이트에는 영향이 없다.

**호환성**: 이 앱이 새 버전(소개 편집 메뉴 포함)인데 `HanRightThat_30` 서버가 아직 구버전이라
`/api/admin/landing` 이 없으면, 소개 페이지 메뉴는 "서버에 소개 API가 아직 없습니다"라는 안내만 보여주고
나머지 메뉴(부스/공연/일정/공지 등)는 평소처럼 동작한다 — 서버 업데이트를 강제로 기다리지 않아도 된다.
반대로 관리자만 이전 버전으로 롤백해도, 그 이전 버전은 `/landing` 메뉴 자체가 없을 뿐 나머지 기능과
데이터는 그대로 보존된다.

## 로그 확인

```bash
docker compose logs -f admin
```

정적 파일만 서빙하므로 nginx 액세스 로그가 대부분이다. 실제 API 에러/감사로그는 `HanRightThat_30` 쪽에서
확인한다 (`/api/admin/audit-logs` 또는 이 대시보드의 "감사로그" 메뉴).

## 2단계 인증 (TOTP)

로그인은 **비밀번호 → 인증 앱 6자리** 2단계다. 비밀번호만 알아서는 관리자 페이지에도, 관리자 API 에도
접근할 수 없다. 검증은 전부 서버(`HanRightThat_30`)가 하며, 이 앱은 화면만 담당한다 —
이 SPA 를 우회해 API 를 직접 호출해도 2FA 를 건너뛸 수 없다.

### 화면 흐름

| 경로 | 언제 보이나 |
|---|---|
| `/login` | 아이디/비밀번호 입력 |
| `/two-factor/setup` | 2FA 미등록 계정이 비밀번호 인증을 통과했을 때 (QR + 수동 키 + 코드 확인 → 복구 코드 1회 표시) |
| `/two-factor` | 2FA 등록 계정이 비밀번호 인증을 통과했을 때 (6칸 OTP 입력 / 복구 코드 입력 전환) |

OTP 입력은 6칸 분리 입력이고 자동 포커스 이동·숫자만 입력·붙여넣기·Enter 제출·모바일 숫자 키패드를
지원한다. 각 칸이 실제 `<input>` 이라 화면 낭독기에서도 정상 동작한다.

### 인증 앱 등록 방법

1. Google Authenticator · Microsoft Authenticator · 1Password · Authy 등 표준 TOTP 앱을 설치한다.
2. 관리자 화면에 로그인하면 나오는 QR 을 앱의 "계정 추가 → QR 스캔"으로 읽는다.
   (QR 을 못 읽으면 "키 보기"를 눌러 나오는 문자열을 수동 입력한다. SHA1 · 6자리 · 30초.)
3. 앱에 표시된 6자리를 입력해야 등록이 완료된다 — QR 만 보고 넘어가면 2FA 가 켜지지 않는다.
4. 화면에 딱 한 번 나오는 **복구 코드 10개**를 저장/인쇄해 안전한 곳에 둔다.

### 복구 코드

인증 앱을 쓸 수 없을 때 로그인 화면의 "복구 코드 사용"으로 들어간다. 각 코드는 1회용이며 쓰는 즉시
폐기된다. 남은 개수는 대시보드에서 볼 수 있고, 사용 사실은 감사로그에 남는다.

### 2FA 초기화 (휴대폰 분실 등)

**로그인 화면에는 초기화 기능이 없다.** 서버에 접근할 수 있는 운영자가 `HanRightThat_30` 쪽에서 CLI 로 실행한다.

```bash
cd /opt/hanwol/HanRightThat_30
docker compose exec web node dist-server/server/resetTwoFactor.js --username admin
docker compose restart web   # 캐시 반영을 위해 재시작
```

실행하면 해당 계정의 secret · 복구 코드 · 세션이 모두 지워지고, 다음 로그인 때 등록 화면부터 다시 시작한다.

## 부스 배치도 편집기

`/booth-map` 메뉴. 공개 사이트와 **같은 학교 지도** 위에서 부스를 직접 편집한다.

- 층(2층/3층)을 고르면 해당 층 배치도가 뜬다. 지도 레이아웃은
  `GET /api/public/floor-plans` 로 공개 사이트와 같은 데이터를 받아 그리므로 두 화면이 어긋나지 않는다.
- **빈 공간을 드래그** → 사각형 영역이 생기고, 오른쪽 패널에서 부스 정보를 입력해 저장한다.
- **부스를 끌기** → 위치 이동. **모서리/변의 손잡이** → 크기 변경. 손을 떼는 순간 자동 저장된다.
- 선택한 부스는 **방향키**로 0.5%씩(Shift 는 2%씩) 미세 조정할 수 있다.
- 부스는 지도 밖으로 나가지 않는다(편집기와 서버 양쪽에서 막는다). 너무 작게 그린 영역은 무시된다.
- 오른쪽 패널에서 이름·팀·위치 설명·층·공개/운영 여부를 바로 고치고, 보관(확인 모달)도 할 수 있다.
- 저장 상태(저장 중 / 저장됨 / 실패)가 상단 배지에 표시된다. 실패하면 서버 값으로 되돌린다.

좌표는 배치도 대비 **비율(%)** 로 저장한다(중심 `position` + 크기 `size`). 픽셀을 쓰지 않으므로
공개 화면을 PC·태블릿·모바일 어디서 열어도 같은 위치에 그려진다. 편집기 자체는 마우스 조작이 전제라
PC 사용을 권장한다.

일반 "부스 관리" 화면에는 X/Y 숫자 입력란이 없다 — 위치는 이 편집기에서만 지정한다.

## 부스 대표 이미지

부스 추가/수정 폼에서 파일을 골라 바로 올린다. PNG · JPG · WebP, 최대 4MB.

- 서버가 실제 파일 내용(매직 넘버)까지 검사하고, 파일명을 새로 만들어 저장한다.
- "이미지 변경"으로 교체, "연결 해제"로 부스에서만 떼기, "파일도 삭제"로 서버에서 완전히 지운다.
  (다른 부스가 쓰고 있는 파일은 삭제가 거부된다.)
- 이미지 설명(대체 텍스트)은 필수다 — 낭독기 사용자와 이미지 로딩 실패 시에 쓰인다.
- 이미지가 없는 부스는 공개 소개 페이지에서 기본 그래픽으로 대체되어 UI 가 깨지지 않는다.
