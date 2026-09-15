# --- 빌드 스테이지: Vite 로 정적 파일을 만든다. 백엔드가 없는 순수 SPA. ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# 브라우저가 직접 호출할 API 주소는 빌드 시점에 번들에 박힌다.
ARG VITE_API_URL=https://hanwol.site
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- 실행 스테이지: nginx 로 정적 파일만 서빙한다. ---
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
