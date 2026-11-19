#!/usr/bin/env bash
# ONFERENCE — 접근 규칙만 다시 배포
#
#   bash deploy/update-rules.sh
#
# 규칙(firestore.rules)은 Cloud Run 이 아니라 Firestore 에 올라간다.
# 규칙만 바뀌었을 때는 앱 재배포 없이 이 명령 하나면 된다.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]] && PROJECT_ID="${DEVSHELL_PROJECT_ID:-}"
[[ -z "${PROJECT_ID}" ]] && { echo "❌ 프로젝트가 지정되지 않았습니다." >&2; exit 1; }

FB() { if [[ -x node_modules/.bin/firebase ]]; then node_modules/.bin/firebase "$@"; else npx --yes firebase-tools@13 "$@"; fi; }

echo "▶ 프로젝트: ${PROJECT_ID}"
echo "▶ 접근 규칙 배포"
FB deploy --only firestore:rules --project "${PROJECT_ID}" --non-interactive

echo
echo "✅ 규칙 반영 완료 — 브라우저 새로고침 후 바로 적용됩니다."
