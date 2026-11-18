# 서버 배포 가이드

ONFERENCE 는 **백엔드가 없는 정적 웹앱**이다. 빌드 결과(`dist/`)를 웹 서버가 서빙하기만 하면
어떤 서버에서든 주소가 생긴다. 데이터는 접속한 사람의 브라우저(localStorage)에 저장되므로
서버에 DB 를 둘 필요가 없다.

> 내부 운영용 도구다. 공개 주소로 열 경우 아래 각 방법의 **접근 제어**를 함께 적용한다.

---

## 선택지 비교

| 방법 | 필요한 것 | 걸리는 시간 | 접근 제어 |
|---|---|---|---|
| ① 파일 1개 업로드 | 웹 호스팅(FTP/웹루트) | 1분 | 서버 설정에 따름 |
| ② Docker + nginx | Docker 가 설치된 서버 | 5분 | nginx basic auth |
| ③ Node 상주 서비스 | Node 18+ 가 설치된 서버 | 5분 | 내장 Basic 인증 |
| ④ Caddy + 도메인 | 서버 + 도메인 | 10분 | Caddy basic_auth + 자동 HTTPS |
| ⑤ GitHub Pages | 서버 불필요 | 3분 | 비공개 저장소는 유료 플랜 필요 |

---

## ① 파일 1개만 올리기 (가장 간단)

`npm run build:html` 로 만든 **`onference-dashboard.html` 한 파일**이 앱 전체다.
웹 루트에 올리면 바로 열린다.

```bash
npm install && npm run build:html
scp onference-dashboard.html user@서버:/var/www/html/onference.html
# → https://서버주소/onference.html
```

## ② Docker + nginx (사내 서버 권장)

```bash
git clone <저장소> && cd onference
docker compose up -d --build
# → http://서버주소:8080
```

접근 제어가 필요하면:

```bash
htpasswd -c deploy/.htpasswd staff          # 계정 생성
# deploy/nginx.conf 의 auth_basic 2줄 주석 해제
# deploy/Dockerfile 의 COPY deploy/.htpasswd 줄 주석 해제
docker compose up -d --build
```

> `.htpasswd` 는 저장소에 커밋하지 않는다(`.gitignore` 에 등록되어 있다).

## ③ Node 상주 서비스 (Docker 없이)

```bash
git clone <저장소> /srv/onference && cd /srv/onference
npm ci && npm run build
sudo cp deploy/onference.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now onference
# → http://서버주소:8080
```

Basic 인증은 서비스 파일의 `AUTH_USER` / `AUTH_PASS` 주석을 해제해 설정한다
(값은 서버에만 두고 저장소에 넣지 않는다).

수동 실행도 가능하다.

```bash
npm run serve                      # dist 를 8080 으로 서빙
PORT=9000 AUTH_USER=staff AUTH_PASS=... npm run serve
```

## ④ Caddy + 도메인 (HTTPS 자동)

```bash
npm ci && npm run build
sudo mkdir -p /srv/onference && sudo cp -r dist/* /srv/onference/
# deploy/Caddyfile 의 도메인을 실제 도메인으로 수정
sudo caddy run --config deploy/Caddyfile
# → https://도메인 (인증서 자동 발급)
```

## ⑤ GitHub Pages (서버가 없을 때)

저장소 **Settings → Pages → Source: GitHub Actions** 로 바꾸면
`.github/workflows/pages.yml` 이 푸시마다 배포한다.
주소는 `https://<계정>.github.io/onference/` 형태다.

비공개 저장소의 Pages 는 유료 플랜에서만 열리므로, 무료 플랜이면 ①~④ 중 하나를 쓰거나
저장소를 공개로 전환해야 한다(데모 데이터는 모두 가상이지만 공개 여부는 운영 판단).

---

## 갱신 방법

소스를 수정한 뒤 배포 방식에 따라 아래 한 줄이면 된다.

```bash
# ① 단일 파일        npm run build:html  → 파일 교체
# ② Docker           git pull && docker compose up -d --build
# ③ systemd          git pull && npm ci && npm run build && sudo systemctl restart onference
# ④ Caddy            git pull && npm run build && sudo cp -r dist/* /srv/onference/
# ⑤ Pages            git push (워크플로가 자동 배포)
```

## 운영 메모

- **데이터 보관**: 서버가 아니라 접속한 브라우저에 저장된다. 같은 주소를 봐도 담당자 간 자동 동기화는 되지 않는다. 공동 편집이 필요해지면 서버·DB 연동이 필요하다.
- **백업**: 서버에는 상태가 없으므로 별도 백업 대상이 없다. 소스는 저장소가 원본이다.
- **HTTPS**: 사내망 밖에서 접속한다면 ④(Caddy) 또는 앞단 리버스 프록시로 HTTPS 를 적용한다. Basic 인증은 평문 HTTP 에서는 보호 효과가 약하다.
- **포트**: 기본 8080. 방화벽에서 해당 포트를 열거나 80/443 으로 프록시한다.
