# 구글 클라우드(GCP) 배포 — Cloud Shell 기준

ONFERENCE 는 백엔드가 없는 정적 웹앱이라 GCP 어디에 올려도 **HTTPS 주소가 바로 나온다.**
아래 명령은 전부 **구글 클라우드 콘솔 우측 상단의 Cloud Shell**(`>_` 아이콘)에서 실행한다.
Cloud Shell 은 이미 로그인된 상태이므로 별도 인증이 필요 없다.

---

## 선택지 비교

| 방법 | 주소 형태 | 비용(소규모) | 추천 상황 |
|---|---|---|---|
| **① Cloud Run** | `https://onference-xxxx.a.run.app` | 사용량 과금, 미사용 시 0원 | **권장** — 접근 제어·갱신이 쉬움 |
| ② Firebase Hosting | `https://<프로젝트ID>.web.app` | 무료 한도 내 | 가장 빠름, 접근 제어 없음 |
| ③ App Engine | `https://<프로젝트ID>.appspot.com` | 무료 한도 내 | 이미 App Engine 을 쓰는 경우 |

세 방법 모두 HTTPS 인증서가 자동이다.

---

## ① Cloud Run (권장)

```bash
# 1) 소스 받기
git clone https://github.com/parkchihong7-gif/onference.git
cd onference
git checkout claude/epic-wright-ljo0j2

# 2) 프로젝트 지정 (이미 설정돼 있으면 생략)
gcloud config set project <프로젝트ID>

# 3) 배포 — 처음에는 API 활성화 때문에 3~5분 걸린다
bash deploy/deploy-cloudrun.sh
```

마지막 줄에 `✅ 배포 완료 / 주소: https://onference-xxxx.a.run.app` 이 출력된다. 그 주소가 끝이다.

**비밀번호를 걸고 싶다면** (내부용이라 권장):

```bash
AUTH_USER=staff AUTH_PASS='원하는비밀번호' bash deploy/deploy-cloudrun.sh
```

브라우저가 아이디/비밀번호를 물어본다. 비밀번호를 바꿀 때는 같은 명령을 다시 실행하면 된다.

**갱신**: 소스를 당겨서 같은 명령을 다시 실행한다.

```bash
git pull && bash deploy/deploy-cloudrun.sh
```

**삭제**: `gcloud run services delete onference --region asia-northeast3`

> 회사 계정으로 로그인한 사람만 접근하게 하려면 Cloud Run 앞에 **IAP(Identity-Aware Proxy)** 를
> 붙이는 방식이 정석이다. 부하 분산기 설정이 필요하므로, 그 구성이 필요하면 알려 달라.

---

## ② Firebase Hosting (가장 빠름)

```bash
git clone https://github.com/parkchihong7-gif/onference.git
cd onference && git checkout claude/epic-wright-ljo0j2
npm ci && npm run build

firebase use <프로젝트ID>      # 최초 1회
firebase deploy --only hosting
```

→ `https://<프로젝트ID>.web.app`

정적 파일만 올리므로 가장 빠르고 저렴하지만 **비밀번호 보호 기능이 없다.** 공개돼도 무방한 경우에만 쓴다.

## ③ App Engine

```bash
git clone https://github.com/parkchihong7-gif/onference.git
cd onference && git checkout claude/epic-wright-ljo0j2
gcloud app deploy app.yaml
```

→ `https://<프로젝트ID>.appspot.com`

접근 제어가 필요하면 `app.yaml` 의 `AUTH_USER` / `AUTH_PASS` 주석을 해제하고 배포한다.

---

## 운영 메모

- **데이터는 서버에 저장되지 않는다.** 접속한 사람의 브라우저(localStorage)에 남는다.
  따라서 서버 백업 대상이 없고, 같은 주소를 보더라도 담당자 간 자동 동기화는 되지 않는다.
  공동 편집이 필요해지는 시점이 DB(예: Firestore)를 붙일 시점이다.
- **비용**: Cloud Run 은 요청이 없으면 인스턴스가 0으로 내려가 과금이 사실상 발생하지 않는다
  (`--min-instances 0` 으로 배포된다). Firebase/App Engine 도 소규모면 무료 한도 안이다.
- **리전**: 기본값은 서울(`asia-northeast3`). 바꾸려면 `REGION=asia-northeast1` 처럼 지정한다.
- **커스텀 도메인**: Cloud Run 콘솔 → 서비스 → "도메인 매핑"에서 연결하면 인증서도 자동 발급된다.
- **비밀번호 관리**: 운영에서 쓸 비밀번호는 Secret Manager 에 두고
  `--set-secrets AUTH_PASS=onference-pass:latest` 형태로 주입하는 편이 낫다. 필요하면 그 구성도 정리해 주겠다.
