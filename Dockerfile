# ONFERENCE — Cloud Run / 일반 컨테이너 공용 이미지
# 정적 산출물(dist)을 의존성 없는 Node 서버로 서빙한다. PORT 환경변수를 그대로 따르므로
# Cloud Run(기본 8080)에서도 수정 없이 동작한다.
#
#   로컬:      docker compose up -d --build        → http://localhost:8080
#   Cloud Run: gcloud run deploy --source .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/dist ./dist
COPY deploy/server.mjs ./deploy/server.mjs
# 비루트 사용자로 실행
USER node
EXPOSE 8080
CMD ["node", "deploy/server.mjs", "dist"]
