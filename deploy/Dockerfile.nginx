# ONFERENCE — 빌드 후 nginx 로 정적 서빙
# 사용: docker compose up -d --build   (저장소 루트에서)

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# 접근 제어가 필요하면 .htpasswd 를 함께 넣고 nginx.conf 의 auth_basic 주석을 해제한다.
# COPY deploy/.htpasswd /etc/nginx/.htpasswd
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
