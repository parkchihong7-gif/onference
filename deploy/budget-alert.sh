#!/usr/bin/env bash
# ONFERENCE — 요금 알림(예산) 설정
#
# 무료 한도를 넘어 실제로 과금이 시작되면 메일로 알려 준다. 요금을 막아 주지는 않지만,
# 모르는 사이에 쌓이는 일을 방지한다. Cloud Shell 에서 한 번만 실행하면 된다.
#
#   bash deploy/budget-alert.sh                 # 기본: 1,000원에 알림
#   AMOUNT=5000 bash deploy/budget-alert.sh     # 5,000원에 알림
#
# 필요 권한: 결제 계정 관리자(Billing Account Administrator)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]] && PROJECT_ID="${DEVSHELL_PROJECT_ID:-}"
AMOUNT="${AMOUNT:-1000}"
NAME="${NAME:-ONFERENCE 요금 알림}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "❌ 프로젝트가 지정되지 않았습니다.  gcloud config set project <프로젝트ID>" >&2
  exit 1
fi

echo "▶ 프로젝트: ${PROJECT_ID}"

echo "▶ 결제 계정 확인"
BILLING="$(gcloud billing projects describe "${PROJECT_ID}" --format='value(billingAccountName)' 2>/dev/null || true)"
if [[ -z "${BILLING}" ]]; then
  echo "❌ 이 프로젝트에 연결된 결제 계정을 찾지 못했습니다." >&2
  echo "   결제가 꺼져 있다면 알림을 걸 대상도 없습니다(= 과금 자체가 불가능한 상태입니다)." >&2
  exit 1
fi
BILLING_ID="${BILLING#billingAccounts/}"
echo "      ${BILLING_ID}"

echo "▶ 예산 API 활성화"
gcloud services enable billingbudgets.googleapis.com --project "${PROJECT_ID}" --quiet

echo "▶ 예산 생성 — ${AMOUNT} (50% · 90% · 100% 도달 시 메일)"
create() {
  gcloud billing budgets create \
    --billing-account="${BILLING_ID}" \
    --display-name="${NAME}" \
    --budget-amount="$1" \
    --filter-projects="projects/${PROJECT_ID}" \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0 \
    --quiet
}
# 결제 계정 통화와 단위가 맞아야 한다. 원화(KRW) 계정이 아니면 USD 로 다시 시도한다.
if ! create "${AMOUNT}KRW" 2>/dev/null; then
  echo "      원화 계정이 아니어서 USD 로 설정합니다 (1 USD)"
  create "1USD"
fi

echo
echo "✅ 요금 알림 설정 완료"
echo "   · 확인/수정: https://console.cloud.google.com/billing/${BILLING_ID}/budgets"
echo "   · 알림은 결제 계정 관리자 메일로 발송됩니다."
echo
echo "   참고: 알림은 '알려 주는' 장치이지 '막는' 장치가 아닙니다."
echo "   현재 규모(담당자 5~10명)에서는 Firestore 무료 한도 안에 들어와 0원이 정상입니다."
