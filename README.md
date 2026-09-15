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

- 로그인/로그아웃 (세션 쿠키, TOTP는 아직 없음 — 아래 "향후 확장" 참고)
- 부스: 목록/추가/수정/보관(soft delete)/복원, 활성·공개 토글, 층/위치/금액 입력
- 공연 순서: CRUD + 순서 변경
- 축제 일정: CRUD (현재 공개 화면에는 아직 노출되지 않음, API 만 존재)
- 공지: CRUD + 게시/비공개 토글 (현재 공개 화면에는 아직 노출되지 않음)
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

## 배포 / 업데이트

```bash
cd /opt/hanwol/HanRightThat_30_admin
git pull
docker compose up -d --build
```

`HanRightThat_30` 재배포와 완전히 독립적이다 — 이 저장소만 다시 배포해도 public 사이트에는 영향이 없다.

## 로그 확인

```bash
docker compose logs -f admin
```

정적 파일만 서빙하므로 nginx 액세스 로그가 대부분이다. 실제 API 에러/감사로그는 `HanRightThat_30` 쪽에서
확인한다 (`/api/admin/audit-logs` 또는 이 대시보드의 "감사로그" 메뉴).

## 향후 확장: TOTP / 2FA

현재는 아이디+비밀번호+세션까지만 구현되어 있다. `HanRightThat_30` 의 `server/auth.ts` 에 있는
`createSession` 호출 직전에 TOTP 코드 검증 단계를 추가하고, 이 앱의 로그인 폼에 인증 코드 입력란을
하나 더 추가하는 방식으로 확장하면 된다. 지금은 별도 저장소/외부 서비스(Cloudflare Access 등) 없이
가장 단순한 형태로 유지했다.
