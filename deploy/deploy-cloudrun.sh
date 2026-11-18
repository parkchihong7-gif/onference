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

# 환경 변수는 YAML 파일 하나로 모아 전달한다.
#  · --set-env-vars 를 두 번 쓰면 뒤엣것이 앞엣것을 덮어쓴다(Firebase 설정이 사라진다)
#  · 비밀번호에 쉼표가 들어 있어도 안전하다
ENV_ARGS=()
ENV_FILE=""
ENV_PAIRS=()

cleanup() { [[ -n "${ENV_FILE}" && -f "${ENV_FILE}" ]] && shred -u "${ENV_FILE}" 2>/dev/null || true; }
trap cleanup EXIT

yaml_kv() { # 키 값 → YAML 한 줄 (작은따옴표 이스케이프)
  printf "%s: '%s'\n" "$1" "${2//\'/\'\'}"
}

# 공유 백엔드(Firestore) 설정 — 지정하면 팀 공동 작업 모드로 뜬다
if [[ -n "${FIREBASE_API_KEY:-}" && -n "${FIREBASE_PROJECT_ID:-}" && -n "${FIREBASE_APP_ID:-}" ]]; then
  echo "▶ 공유 백엔드(Firestore) 설정을 포함해 배포합니다: ${FIREBASE_PROJECT_ID}"
  ENV_PAIRS+=("FIREBASE_API_KEY=${FIREBASE_API_KEY}")
  ENV_PAIRS+=("FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}")
  ENV_PAIRS+=("FIREBASE_APP_ID=${FIREBASE_APP_ID}")
  ENV_PAIRS+=("FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN:-${FIREBASE_PROJECT_ID}.firebaseapp.com}")
  if [[ -n "${ALLOWED_DOMAIN:-}" ]]; then ENV_PAIRS+=("ALLOWED_DOMAIN=${ALLOWED_DOMAIN}"); fi
else
  echo "▶ 공유 백엔드 설정이 없어 1인(로컬 저장) 모드로 배포합니다."
fi

if [[ -n "${AUTH_USER:-}" && -n "${AUTH_PASS:-}" ]]; then
  echo "▶ Basic 인증을 켠 상태로 배포합니다 (사용자: ${AUTH_USER})"
  ENV_PAIRS+=("AUTH_USER=${AUTH_USER}")
  ENV_PAIRS+=("AUTH_PASS=${AUTH_PASS}")
else
  echo "▶ 인증 없이 공개 주소로 배포합니다. 링크를 아는 사람은 누구나 열 수 있습니다."
fi

if [[ ${#ENV_PAIRS[@]} -gt 0 ]]; then
  ENV_FILE="$(mktemp -t onference-env-XXXXXX.yaml)"
  : > "${ENV_FILE}"
  SET_KEYS=""
  for pair in "${ENV_PAIRS[@]}"; do
    yaml_kv "${pair%%=*}" "${pair#*=}" >> "${ENV_FILE}"
    SET_KEYS="${SET_KEYS} ${pair%%=*}"
  done

  # 이번에 지정하지 않은 기존 환경 변수는 그대로 이어받는다.
  # (예: 비밀번호만 바꾸려고 AUTH_* 만 넘겨도 Firestore 설정이 사라지지 않는다)
  CURRENT_JSON="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" \
    --region "${REGION}" --format=json 2>/dev/null || true)"
  if [[ -n "${CURRENT_JSON}" ]]; then
    CARRIED="$(printf '%s' "${CURRENT_JSON}" | node -e '
      let raw = ""
      process.stdin.on("data", d => { raw += d })
      process.stdin.on("end", () => {
        const skip = new Set(process.argv.slice(1))
        let svc; try { svc = JSON.parse(raw) } catch { process.exit(0) }
        const env = svc?.spec?.template?.spec?.containers?.[0]?.env ?? []
        for (const e of env) {
          // 시크릿 참조(valueFrom)는 건드리지 않는다
          if (!e || typeof e.value !== "string" || skip.has(e.name)) continue
          process.stdout.write(`${e.name}: '"'"'${e.value.replace(/'"'"'/g, "'"'"''"'"'")}'"'"'\n`)
        }
      })
    ' ${SET_KEYS})"
    if [[ -n "${CARRIED}" ]]; then
      echo "▶ 기존 환경 변수를 이어받습니다: $(printf '%s' "${CARRIED}" | cut -d: -f1 | tr '\n' ' ')"
      printf '%s\n' "${CARRIED}" >> "${ENV_FILE}"
    fi
  fi
  ENV_ARGS+=(--env-vars-file "${ENV_FILE}")
else
  # 아무 설정도 주지 않으면 이미 배포된 환경 변수를 그대로 유지한다(코드만 갱신)
  echo "▶ 환경 변수는 건드리지 않습니다 — 기존 설정을 그대로 유지한 채 코드만 갱신합니다."
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
