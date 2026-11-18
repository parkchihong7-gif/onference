#!/usr/bin/env bash
# ONFERENCE — Cloud Run 주소를 Firebase 로그인 '승인된 도메인'에 등록
#
#   bash deploy/authorize-domain.sh
#
# 구글 로그인(팝업·리디렉션)은 앱이 떠 있는 도메인이 승인 목록에 있어야 동작한다.
# 기본 목록에는 localhost 와 <프로젝트>.firebaseapp.com 만 있어서, Cloud Run 주소
# (*.run.app)는 직접 추가해야 한다. 콘솔에서 눌러도 되고 이 스크립트로 해도 된다.
#   콘솔 경로: Authentication → 설정 → 승인된 도메인 → 도메인 추가

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]] && PROJECT_ID="${DEVSHELL_PROJECT_ID:-}"
SERVICE="${SERVICE:-onference}"
[[ -z "${PROJECT_ID}" ]] && { echo "❌ 프로젝트가 지정되지 않았습니다." >&2; exit 1; }

# 등록할 도메인 — 인자로 주면 그것을, 없으면 배포된 Cloud Run 주소를 쓴다
DOMAIN="${1:-}"
if [[ -z "${DOMAIN}" ]]; then
  REGION="${REGION:-$(gcloud run services list --project "${PROJECT_ID}" \
    --format='value(region)' --filter="metadata.name=${SERVICE}" 2>/dev/null | head -1)}"
  [[ -z "${REGION}" ]] && { echo "❌ '${SERVICE}' 서비스를 찾지 못했습니다. 도메인을 직접 적어 주세요:  bash deploy/authorize-domain.sh example.a.run.app" >&2; exit 1; }
  URL="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"
  DOMAIN="${URL#https://}"
  DOMAIN="${DOMAIN%%/*}"
fi
echo "▶ 프로젝트: ${PROJECT_ID}"
echo "▶ 등록할 도메인: ${DOMAIN}"

gcloud services enable identitytoolkit.googleapis.com --project "${PROJECT_ID}" --quiet

TOKEN="$(gcloud auth print-access-token)"
API="https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config"
# Cloud Shell 은 사용자 자격증명(ADC)으로 호출하므로 할당량 프로젝트를 명시해야 한다.
# 이게 없으면 403 "requires a quota project" 로 거부된다.
AUTH_HEADERS=(-H "Authorization: Bearer ${TOKEN}" -H "x-goog-user-project: ${PROJECT_ID}")

CURRENT="$(curl -sS "${AUTH_HEADERS[@]}" "${API}")"
if printf '%s' "${CURRENT}" | grep -q '"error"'; then
  echo "❌ 현재 설정을 읽지 못했습니다:" >&2
  printf '%s\n' "${CURRENT}" | head -20 >&2
  echo >&2
  echo "   콘솔에서 직접 추가해도 됩니다 — Authentication → 설정 → 승인된 도메인" >&2
  echo "   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings" >&2
  exit 1
fi

BODY="$(printf '%s' "${CURRENT}" | DOMAIN="${DOMAIN}" node -e '
let raw = ""
process.stdin.on("data", d => { raw += d })
process.stdin.on("end", () => {
  const cfg = JSON.parse(raw)
  const list = cfg.authorizedDomains ?? []
  const add = process.env.DOMAIN
  if (list.includes(add)) process.exit(3)
  console.log(JSON.stringify({ authorizedDomains: [...list, add] }))
})
')" || {
  if [[ $? -eq 3 ]]; then echo "✓ 이미 등록되어 있습니다 — 추가 작업이 필요 없습니다."; exit 0; fi
  echo "❌ 설정을 해석하지 못했습니다." >&2; exit 1
}

RESP="$(curl -sS -X PATCH "${API}?updateMask=authorizedDomains" \
  "${AUTH_HEADERS[@]}" -H "Content-Type: application/json" \
  -d "${BODY}")"

if printf '%s' "${RESP}" | grep -q '"error"'; then
  echo "❌ 등록에 실패했습니다:" >&2
  printf '%s\n' "${RESP}" | head -20 >&2
  echo "   콘솔에서 직접 추가하세요 — https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings" >&2
  exit 1
fi

echo
echo "✅ 승인된 도메인에 등록했습니다"
printf '%s' "${RESP}" | node -e '
let raw=""; process.stdin.on("data",d=>raw+=d)
process.stdin.on("end",()=>{ const c=JSON.parse(raw); console.log("   현재 목록: " + (c.authorizedDomains ?? []).join(", ")) })
'
