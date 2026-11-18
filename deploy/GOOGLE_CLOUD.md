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

## 공동 작업 설정 (Firestore) — 담당자 여러 명이 함께 쓰기

위 배포만으로는 **각자 브라우저에만 저장**된다. 팀이 같은 데이터를 보려면 Firestore 를 붙인다.
같은 GCP 프로젝트 안에서 끝나고, 추가 서버는 없다.

### 1) Firestore 와 로그인 준비 (콘솔에서 한 번)

1. 콘솔 → **Firestore** → 데이터베이스 만들기 → **Native 모드** → 리전 `asia-northeast3`
2. 콘솔 → **Firebase** 에서 같은 프로젝트를 Firebase 로 추가(기존 GCP 프로젝트 선택)
3. Firebase 콘솔 → 빌드 → **Authentication** → 시작하기 → **Google** 공급자 사용 설정
4. Firebase 콘솔 → 프로젝트 설정 → 내 앱 → **웹 앱 추가** → 표시되는 설정값 중
   `apiKey` / `appId` 를 메모한다

### 2) 보안 규칙과 초기 데이터 올리기 (Cloud Shell)

```bash
cd onference
npm ci

# 역할별 접근 규칙 배포
npx firebase deploy --only firestore:rules --project <프로젝트ID>

# 초기 데이터 + 관리자 초대 (본인 구글 계정 이메일을 적는다)
npm run seed:export
node scripts/seed-firestore.mjs --project <프로젝트ID> --admin you@example.org
```

> 데모 데이터 없이 **빈 상태**로 시작하려면 `--empty` 를 붙인다.
> 이미 운영 중인 데이터를 지우고 다시 넣으려면 `--wipe` (주의해서 사용).

### 3) 설정을 넣어 다시 배포

```bash
FIREBASE_API_KEY='AIza...' FIREBASE_PROJECT_ID='<프로젝트ID>' FIREBASE_APP_ID='1:123...:web:abc...' ALLOWED_DOMAIN='example.org' bash deploy/deploy-cloudrun.sh
```

`ALLOWED_DOMAIN` 은 선택이다(지정하면 해당 도메인 계정만 로그인 가능).
배포 후 주소를 열면 **구글 계정 로그인 화면**이 뜨고, 초대된 계정만 들어갈 수 있다.

### 4) 담당자 추가

앱에서 **행사 설정 · 모듈 → 구성원 · 접근 권한** 에서 이메일과 역할을 지정해 초대한다.
초대된 사람이 그 구글 계정으로 로그인하면 바로 접근된다. 역할별로 고칠 수 있는 범위가 다르다
(여행사는 교통·숙박, 재무는 정산 등 — 자세한 내용은 `docs/07_공동작업_백엔드.md`).

### 비용

Firestore 무료 한도는 하루 읽기 5만·쓰기 2만 건이다. 담당자 10여 명이 상시 열어 두어도
이 규모의 행사 데이터(수천 건)로는 한도 안쪽이다.

---

## 운영 메모

- **저장 위치**: Firestore 를 연결하면 데이터가 서버에 저장되고 모든 담당자가 실시간으로 공유한다.
  연결하지 않으면 접속한 사람의 브라우저에만 남는다(1인 모드). 화면 상단에 현재 모드가 표시된다.
- **백업**: Firestore 는 콘솔에서 내보내기(Export)를 예약할 수 있다. 중요한 행사 전후로 걸어 두면 좋다.
- **비용**: Cloud Run 은 요청이 없으면 인스턴스가 0으로 내려가 과금이 사실상 발생하지 않는다
  (`--min-instances 0` 으로 배포된다). Firebase/App Engine 도 소규모면 무료 한도 안이다.
- **리전**: 기본값은 서울(`asia-northeast3`). 바꾸려면 `REGION=asia-northeast1` 처럼 지정한다.
- **커스텀 도메인**: Cloud Run 콘솔 → 서비스 → "도메인 매핑"에서 연결하면 인증서도 자동 발급된다.
- **비밀번호 관리**: 운영에서 쓸 비밀번호는 Secret Manager 에 두고
  `--set-secrets AUTH_PASS=onference-pass:latest` 형태로 주입하는 편이 낫다. 필요하면 그 구성도 정리해 주겠다.
