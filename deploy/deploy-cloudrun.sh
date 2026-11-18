#!/usr/bin/env bash
# ONFERENCE → Google Cloud Run 배포
#
# 구글 클라우드 콘솔의 Cloud Shell 에서 실행한다(이미 로그인되어 있다).
#   bash deploy/deploy-cloudrun.sh                      # 공개 주소
#   AUTH_USER=staff AUTH_PASS='비밀번호' bash deploy/deploy-cloudrun.sh   # 비밀번호 보호
#
# 환경 변수
#   PROJECT_ID  기본값: 현재 gcloud 설정 프로젝트
#   REGION      기본값: asia-northeast3 (서울)
#   SERVICE     기본값: onference
#   AUTH_USER / AUTH_PASS  지정 시 Basic 인증을 켠 상태로 배포

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-northeast3}"
SERVICE="${SERVICE:-onference}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "프로젝트가 설정되지 않았습니다. 먼저 실행하세요:  gcloud config set project <프로젝트ID>" >&2
  exit 1
fi

echo "▶ 프로젝트: ${PROJECT_ID} / 리전: ${REGION} / 서비스: ${SERVICE}"

echo "▶ 필요한 API 활성화 (최초 1회만 시간이 걸립니다)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "${PROJECT_ID}" --quiet

ENV_ARGS=()
if [[ -n "${AUTH_USER:-}" && -n "${AUTH_PASS:-}" ]]; then
  echo "▶ Basic 인증을 켠 상태로 배포합니다 (사용자: ${AUTH_USER})"
  ENV_ARGS+=(--set-env-vars "AUTH_USER=${AUTH_USER},AUTH_PASS=${AUTH_PASS}")
else
  echo "▶ 인증 없이 공개 주소로 배포합니다. 링크를 아는 사람은 누구나 열 수 있습니다."
fi

echo "▶ 빌드 및 배포"
gcloud run deploy "${SERVICE}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 3 \
  --quiet \
  "${ENV_ARGS[@]}"

URL="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"
echo
echo "✅ 배포 완료"
echo "   주소: ${URL}"
echo
echo "   · 다시 배포:  bash deploy/deploy-cloudrun.sh"
echo "   · 서비스 삭제: gcloud run services delete ${SERVICE} --region ${REGION}"
