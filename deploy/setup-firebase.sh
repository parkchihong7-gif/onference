#!/usr/bin/env bash
# ONFERENCE 공동 작업 설정 — Firestore + 구글 로그인 한 번에 켜기
#
# Cloud Shell 에서 실행한다(이미 로그인되어 있음):
#   bash deploy/setup-firebase.sh --admin 본인이메일@도메인
#
# 하는 일
#   1) 필요한 API 활성화
#   2) Firestore(Native, 서울) 생성 — 이미 있으면 건너뜀
#   3) 프로젝트에 Firebase 추가 + 웹 앱 등록 → 설정값 자동 획득(직접 복사할 필요 없음)
#   4) 역할별 접근 규칙 배포
#   5) 초기 데이터 업로드 + 관리자 초대
#   6) 설정을 넣어 Cloud Run 재배포 → 주소 출력
#
# 옵션
#   --admin  <이메일>   관리자(사무국)로 초대할 구글 계정. 쉼표로 여러 명 가능 (필수)
#   --project <ID>      GCP 프로젝트 (기본: gcloud 현재 설정)
#   --region <리전>     Cloud Run 리전 (기본: asia-northeast3)
#   --empty             데모 데이터 없이 빈 상태로 시작
#   --domain <도메인>   해당 도메인 계정만 로그인 허용 (예: example.org)

set -euo pipefail

arg() { local n="$1"; shift; local i=1; for a in "$@"; do if [[ "$a" == "--$n" ]]; then eval "echo \${$((i+1))}"; return; fi; i=$((i+1)); done; }
has() { local n="$1"; shift; for a in "$@"; do [[ "$a" == "--$n" ]] && return 0; done; return 1; }

ADMIN="$(arg admin "$@" || true)"
PROJECT_ID="$(arg project "$@" || true)"
REGION="$(arg region "$@" || true)"
DOMAIN="$(arg domain "$@" || true)"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-northeast3}"
SERVICE="${SERVICE:-onference}"

if [[ -z "${ADMIN}" ]]; then
  echo "❌ 관리자 이메일이 필요합니다.  예) bash deploy/setup-firebase.sh --admin you@example.org" >&2
  exit 1
fi
if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "❌ 프로젝트를 찾을 수 없습니다.  gcloud config set project <프로젝트ID> 를 먼저 실행하세요." >&2
  exit 1
fi

echo "▶ 프로젝트: ${PROJECT_ID} / 리전: ${REGION} / 관리자: ${ADMIN}"
echo

echo "[1/6] 필요한 API 활성화"
gcloud services enable \
  firestore.googleapis.com firebase.googleapis.com identitytoolkit.googleapis.com \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "${PROJECT_ID}" --quiet

echo "[2/6] Firestore 데이터베이스 확인"
if gcloud firestore databases describe --project "${PROJECT_ID}" --database='(default)' >/dev/null 2>&1; then
  echo "      이미 존재 — 건너뜀"
else
  gcloud firestore databases create \
    --location="${REGION}" --type=firestore-native \
    --project "${PROJECT_ID}" --quiet
  echo "      생성 완료 (Native 모드, ${REGION})"
fi

echo "[3/6] Firebase 연결 및 웹 앱 등록"
npx --yes firebase-tools@13 projects:addfirebase "${PROJECT_ID}" >/dev/null 2>&1 \
  && echo "      Firebase 추가 완료" || echo "      이미 Firebase 프로젝트임 — 건너뜀"

# 표 출력은 버전마다 달라지므로 JSON 으로 받아 파싱한다
pick_app_id() {
  node -e '
    let raw = ""
    process.stdin.on("data", d => raw += d)
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(raw)
        const list = Array.isArray(j.result) ? j.result : (j.result ? [j.result] : [])
        const hit = list.find(a => (a.displayName || "").includes("onference")) || list[0]
        process.stdout.write(hit?.appId ?? "")
      } catch { process.stdout.write("") }
    })'
}

APP_ID="$(npx --yes firebase-tools@13 apps:list WEB --project "${PROJECT_ID}" --json 2>/dev/null | pick_app_id)"
if [[ -z "${APP_ID}" ]]; then
  echo "      웹 앱 생성"
  APP_ID="$(npx --yes firebase-tools@13 apps:create WEB onference --project "${PROJECT_ID}" --json 2>/dev/null | pick_app_id)"
fi
[[ -z "${APP_ID}" ]] && { echo "❌ 웹 앱 ID를 가져오지 못했습니다. Firebase 콘솔에서 웹 앱을 추가한 뒤 다시 실행하세요." >&2; exit 1; }

SDK_JSON="$(npx --yes firebase-tools@13 apps:sdkconfig WEB "${APP_ID}" --project "${PROJECT_ID}" --json 2>/dev/null)"
API_KEY="$(node -e "const j=JSON.parse(process.argv[1]); const c=j.result?.sdkConfig??j.sdkConfig??{}; process.stdout.write(c.apiKey??'')" "${SDK_JSON}")"
AUTH_DOMAIN="$(node -e "const j=JSON.parse(process.argv[1]); const c=j.result?.sdkConfig??j.sdkConfig??{}; process.stdout.write(c.authDomain??'')" "${SDK_JSON}")"
[[ -z "${API_KEY}" ]] && { echo "❌ API 키를 가져오지 못했습니다." >&2; exit 1; }
echo "      웹 앱: ${APP_ID}"

echo "[4/6] 역할별 접근 규칙 배포"
npx --yes firebase-tools@13 deploy --only firestore:rules --project "${PROJECT_ID}" --non-interactive

echo "[5/6] 초기 데이터 업로드 및 관리자 초대"
npm ci --omit=optional --silent 2>/dev/null || npm install --silent
npm run seed:export --silent
SEED_ARGS=(--project "${PROJECT_ID}" --admin "${ADMIN}")
has empty "$@" && SEED_ARGS+=(--empty)
node scripts/seed-firestore.mjs "${SEED_ARGS[@]}"

echo "[6/6] 공동 작업 설정을 넣어 재배포"
FIREBASE_API_KEY="${API_KEY}" \
FIREBASE_PROJECT_ID="${PROJECT_ID}" \
FIREBASE_APP_ID="${APP_ID}" \
FIREBASE_AUTH_DOMAIN="${AUTH_DOMAIN}" \
ALLOWED_DOMAIN="${DOMAIN:-}" \
REGION="${REGION}" SERVICE="${SERVICE}" \
bash deploy/deploy-cloudrun.sh

cat <<MSG

────────────────────────────────────────────────────────────
⚠ 마지막 한 단계는 콘솔에서 직접 눌러야 합니다 (자동화 불가)

  Firebase 콘솔 → 빌드 → Authentication → 시작하기
  → 로그인 방법 → Google → 사용 설정 → 저장

  https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers

이걸 켜야 로그인 버튼이 동작합니다.
────────────────────────────────────────────────────────────

그다음 주소를 열면 구글 로그인 화면이 뜹니다.
${ADMIN} 계정으로 로그인하면 사무국 권한으로 들어가며,
앱의 [행사 설정 · 모듈 → 구성원] 에서 담당자를 이메일로 초대하면 됩니다.
MSG
