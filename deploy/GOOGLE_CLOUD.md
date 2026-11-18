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

### 최초 배포

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

### 코드를 고친 뒤 다시 배포 (가장 자주 쓰는 명령)

```bash
cd ~/onference
git pull
bash deploy/deploy-cloudrun.sh
```

환경 변수를 따로 주지 않으면 **이미 배포된 설정(Firestore·비밀번호)은 그대로 유지**되고 코드만 바뀐다.

### 자주 쓰는 명령 모음

| 하고 싶은 것 | 명령 |
|---|---|
| 코드만 갱신해 재배포 | `git pull && bash deploy/deploy-cloudrun.sh` |
| 비밀번호 걸고 배포 | `AUTH_USER=staff AUTH_PASS='비밀번호' bash deploy/deploy-cloudrun.sh` |
| 비밀번호 바꾸기 | 위와 같은 명령을 새 비밀번호로 다시 실행 |
| 공동 작업(Firestore) 켜기 | `bash deploy/setup-firebase.sh --admin 본인구글계정` (끝에서 재배포까지 자동) |
| 공동 작업 + 비밀번호 한 번에 | `AUTH_USER=staff AUTH_PASS='비밀번호' bash deploy/setup-firebase.sh --admin 본인구글계정` |
| 현재 주소 확인 | `gcloud run services describe onference --region asia-northeast3 --format='value(status.url)'` |
| 현재 설정(환경 변수) 확인 | `gcloud run services describe onference --region asia-northeast3 --format='value(spec.template.spec.containers[0].env)'` |
| 배포 이력 보기 | `gcloud run revisions list --service onference --region asia-northeast3` |
| 직전 버전으로 되돌리기 | `gcloud run services update-traffic onference --region asia-northeast3 --to-revisions <리비전이름>=100` |
| 실시간 로그 보기 | `gcloud beta run services logs tail onference --region asia-northeast3` |
| **현재 설정·주소 확인** | `bash deploy/show-config.sh` |
| 구글 로그인 승인 도메인 등록 | `bash deploy/authorize-domain.sh` |
| 비밀번호 떼기 | `gcloud run services update onference --region asia-northeast3 --remove-env-vars AUTH_USER,AUTH_PASS` |
| 서비스 삭제 | `gcloud run services delete onference --region asia-northeast3` |

리전을 서울(`asia-northeast3`)이 아닌 곳에 배포했다면 위 명령의 `--region` 값을 바꾼다.
어디에 있는지 모르면 `gcloud run services list` 로 확인한다.

### 구글 로그인 창이 "승인되지 않은 도메인" 이라고 할 때

구글 로그인은 **앱이 떠 있는 도메인이 승인 목록에 있어야** 동작한다. 기본 목록에는
`localhost` 와 `<프로젝트>.firebaseapp.com` 만 있고 Cloud Run 주소(`*.run.app`)는 없다.

```bash
cd ~/onference && bash deploy/authorize-domain.sh
```

`setup-firebase.sh` 는 마지막 단계에서 이 등록까지 자동으로 한다. 콘솔에서 직접 해도 된다 —
Authentication → 설정 → 승인된 도메인 → 도메인 추가.

### 구글 로그인은 됐는데 "이 계정은 아직 초대되지 않았습니다" 가 뜰 때

데이터 접근은 `memberInvites/<이메일>` 초대장이 있어야 허용된다. 초기 설정에서
`--admin` 으로 넘긴 이메일에 초대장이 만들어지는데, 그 단계가 건너뛰어졌거나
로그인한 계정의 이메일이 다르면 이 화면이 나온다.

```bash
cd ~/onference

# 현재 초대장·구성원·데이터 적재 상태 확인
node scripts/check-access.mjs

# 해당 계정을 사무국 권한으로 초대
node scripts/check-access.mjs --invite parkchihong7@gmail.com
```

등록 후 브라우저를 새로고침하고 다시 로그인하면 들어가진다. 이후 추가 인원은
앱의 `행사 설정 · 모듈 → 구성원 초대` 에서 넣으면 된다.

### 비밀번호 창에서 로그인이 안 될 때

주소를 열었을 때 나오는 **사용자 이름 / 비밀번호** 창은 구글 로그인이 아니라 주소에 건
Basic 인증이다. 들어가지 못한다면 순서대로 확인한다.

```bash
# 1) 지금 무엇이 걸려 있는지 확인 (사용자 이름·비밀번호가 그대로 출력된다)
cd ~/onference && bash deploy/show-config.sh

# 2) 영문+숫자로 다시 설정
AUTH_USER=staff AUTH_PASS='onference2026' bash deploy/deploy-cloudrun.sh

# 3) 아예 떼고 구글 로그인만 쓰기
gcloud run services update onference --region asia-northeast3 \
  --remove-env-vars AUTH_USER,AUTH_PASS
```

**비밀번호에 한글을 쓰지 않는다.** Basic 인증의 자격증명 인코딩은 브라우저마다 달라
(UTF-8 또는 ISO-8859-1), 한글은 후자로 아예 표현되지 않아 서버가 받을 방법이 없다.
서버는 양쪽 인코딩을 모두 받아들이도록 되어 있지만, 한글은 원천적으로 전달이 불가능하다.

### 알아둘 점

- **비밀번호만 바꿔도 Firestore 설정은 유지된다.** 스크립트가 이번에 지정하지 않은 기존 환경 변수를
  읽어서 그대로 이어붙인다(시크릿 참조는 건드리지 않는다).
- `AUTH_PASS` 에 쉼표·`@`·따옴표가 들어가도 안전하다(환경 변수를 YAML 파일로 전달한다).
- 빌드는 Cloud Build 에서 돌아간다. 첫 배포만 3~5분이고 이후에는 1~2분이다.
- Cloud Shell 은 일정 시간 쓰지 않으면 홈 디렉터리를 제외한 상태가 초기화된다. 소스는 `~/onference`
  에 남아 있으므로 다음에는 `cd ~/onference && git pull` 부터 시작하면 된다.

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

### 공동 작업과 비밀번호를 한 번에 켜기

`setup-firebase.sh` 는 마지막에 Cloud Run 재배포까지 하므로, 비밀번호 설정을 앞에 붙이면 한 번에 끝난다.

```bash
AUTH_USER=staff AUTH_PASS='원하는비밀번호' \
  bash deploy/setup-firebase.sh --admin 본인구글계정@gmail.com
```

이렇게 하면 **잠금이 두 겹**이 된다.

| 겹 | 무엇 | 누구에게 보이나 |
|---|---|---|
| 1 | 주소 자체의 비밀번호(Basic 인증) | 브라우저가 아이디/비밀번호를 묻는다. 링크가 유출돼도 페이지가 열리지 않는다 |
| 2 | 구글 로그인 | 초대된 계정만 데이터를 읽고 쓸 수 있다(역할별 권한 적용) |

1번은 팀원 전원이 같은 아이디/비밀번호를 공유하고, 2번이 개인 식별과 권한을 담당한다.
팀원에게는 **주소 + 공용 비밀번호**를 알려주고, 각자 본인 구글 계정으로 로그인하게 하면 된다.

> 비밀번호 없이 구글 로그인만으로 충분하다면 `AUTH_USER`/`AUTH_PASS` 를 빼면 된다.
> 데이터는 어차피 로그인한 초대 계정만 접근할 수 있다. 비밀번호는 "링크를 아는 외부인이
> 로그인 화면조차 보지 못하게" 하는 추가 장치다.

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
