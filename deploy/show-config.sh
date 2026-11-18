#!/usr/bin/env bash
# ONFERENCE — 지금 배포된 설정 확인
#
#   bash deploy/show-config.sh
#
# 서비스가 어느 리전에 있는지 자동으로 찾아, 주소와 현재 환경 변수를 보여 준다.
# 로그인이 안 될 때 "무엇이 설정돼 있는지" 부터 확인하는 용도.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]] && PROJECT_ID="${DEVSHELL_PROJECT_ID:-}"
SERVICE="${SERVICE:-onference}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "❌ 프로젝트가 지정되지 않았습니다.  gcloud config set project <프로젝트ID>" >&2
  exit 1
fi

echo "▶ 프로젝트: ${PROJECT_ID}"

# 리전을 모르면 서비스 목록에서 찾는다
REGION="${REGION:-}"
if [[ -z "${REGION}" ]]; then
  # gcloud 버전에 따라 리전 필드 이름이 다르므로 둘 다 시도한다
  REGION="$(gcloud run services list --project "${PROJECT_ID}" \
    --format='value(region)' --filter="metadata.name=${SERVICE}" 2>/dev/null | head -1)"
  if [[ -z "${REGION}" ]]; then
    REGION="$(gcloud run services list --project "${PROJECT_ID}" \
      --format="value(metadata.labels['cloud.googleapis.com/location'])" \
      --filter="metadata.name=${SERVICE}" 2>/dev/null | head -1)"
  fi
fi
if [[ -z "${REGION}" ]]; then
  echo "❌ '${SERVICE}' 서비스를 찾지 못했습니다. 현재 배포된 서비스 목록:" >&2
  gcloud run services list --project "${PROJECT_ID}" --format='table(metadata.name, region, status.url)' >&2 || true
  exit 1
fi
echo "▶ 리전: ${REGION}"

JSON="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" --format=json)"

printf '%s' "${JSON}" | node -e '
let raw = ""
process.stdin.on("data", d => { raw += d })
process.stdin.on("end", () => {
  const s = JSON.parse(raw)
  const env = s?.spec?.template?.spec?.containers?.[0]?.env ?? []
  const get = n => env.find(e => e.name === n)?.value ?? ""
  console.log("")
  console.log("주소: " + (s?.status?.url ?? "(알 수 없음)"))
  console.log("")
  const user = get("AUTH_USER"), pass = get("AUTH_PASS")
  if (user || pass) {
    console.log("● 주소 비밀번호(Basic 인증): 켜짐")
    console.log("   사용자 이름: " + JSON.stringify(user))
    console.log("   비밀번호   : " + JSON.stringify(pass))
    const odd = [...(user + pass)].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)
    if (odd) console.log("   ⚠ 영문·숫자 외 문자가 들어 있습니다. 브라우저에 따라 로그인이 실패합니다 — 영문+숫자로 바꾸세요.")
  } else {
    console.log("● 주소 비밀번호(Basic 인증): 꺼짐 (링크를 아는 사람은 바로 열 수 있음)")
  }
  console.log("")
  const fb = get("FIREBASE_PROJECT_ID")
  if (fb) {
    console.log("● 공동 작업(Firestore): 켜짐 — " + fb)
    console.log("   로그인 도메인: " + get("FIREBASE_AUTH_DOMAIN"))
    if (get("ALLOWED_DOMAIN")) console.log("   허용 도메인  : " + get("ALLOWED_DOMAIN"))
  } else {
    console.log("● 공동 작업(Firestore): 꺼짐 — 1인(브라우저 저장) 모드로 동작합니다")
  }
  console.log("")
  console.log("설정된 환경 변수: " + (env.map(e => e.name).join(", ") || "(없음)"))
})
'
