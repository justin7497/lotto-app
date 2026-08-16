# 회차 갱신 파이프라인 전환 계획서

**목표:** 토요 추첨 후 **데이터·알림**은 Firebase(Functions + Scheduler)가 담당하고, **앱 전체 빌드·Hosting 배포**는 코드 변경 시에만 수행한다.

**작성일:** 2026-08-16  
**상태:** 계획 (구현 전)  
**관련:** 유사 앱 조사(`lotto-update-solutions-survey` 캔버스), 기존 Actions `Update Lotto Data & Deploy`

---

## 1. 배경

### 1.1 현재 문제

| 현상 | 원인 |
|------|------|
| 토요 Actions 실패 메일 | 데이터 커밋 후 **typecheck** 실패 → **빌드·배포 스킵** |
| 이후 스케줄은 “성공” | 데이터 변경 없음 → typecheck/deploy 자체를 안 함 |
| 파이프라인 이중화 | Actions(주간 배포)와 Functions(이미 Firestore sync)가 **역할이 겹침** |

### 1.2 이미 있는 Firebase 자산 (재사용)

`functions/index.js`에 이미 구현됨:

- `refreshLottoSyncCache` → Firestore `appConfig/lottoSync`
- `refreshLottoDetailSyncCache` → `appConfig/lottoDetailSync`
- `scheduledLottoSyncSat20/21/22` — 토요 20:40~ 폴링
- `scheduledLottoSyncSun0900` — 일요 재시도

앱 클라이언트(`LottoDataContext`)도 Firestore sync + `/lotto-sync.json` + 동행복권 API를 이미 조합함.

→ **“Firebase로 바꾼다” = 제로에서 시작이 아니라, Actions 주간 배포를 걷어내고 Functions를 주 경로로 완성하는 것.**

---

## 2. 목표 아키텍처

```
[토요 추첨]
    │
    ▼
Cloud Scheduler → scheduledLottoSync*
    │
    ├─► Firestore appConfig/lottoSync (번호)
    ├─► Firestore appConfig/lottoDetailSync (등수·판매점)
    └─► (신규) 당첨/참여 알림 Functions
              │
              ├─ notify winners (email/FCM)
              ├─ device wins (발급완료 슬립)
              └─ engagement (sat-post-draw)

[앱 실행 시]
  LottoDataProvider → Firestore sync 우선 → 로컬 캐시 → (폴백) lotto-sync.json / API

[코드 변경·릴리스]
  로컬 또는 CI → build:lotto → firebase deploy hosting(+functions)
  ※ 주간 스케줄로 Hosting 풀배포 하지 않음
```

### 책임 분리

| 구분 | 담당 | 주기 |
|------|------|------|
| 최신 회차 번호·상세 | Firebase Functions | 토요/일요 스케줄 |
| 당첨·참여 푸시/메일 | Firebase Functions | sync 성공 직후 |
| `lottoData.json` 번들 갱신 | (선택) 월 1회 Actions 또는 수동 | 낮음 |
| Hosting/앱 배포 | 수동 `release:lotto --deploy` 또는 **코드 push CI** | 기능 배포 시만 |
| typecheck | 코드 CI (PR/push) | 배포 파이프와 분리 |

---

## 3. 범위

### In scope (Phase 1~3)

1. Functions를 **주간 데이터의 Single Source of Truth**로 확정·관측 가능하게 만들기  
2. Actions **스케줄 배포 축소/제거** (실패해도 회차 반영은 Functions가 담당)  
3. 알림 스크립트(`notify-*.mjs`)를 Functions 스케줄/호출로 이전 또는 트리거  
4. 클라이언트·운영 체크리스트 (Firestore 우선, 실패 알림)  
5. (선택) Hosting의 `lotto-sync.json`을 배포 없이 갱신하는 방법 검토  

### Out of scope (이번 계획에서 하지 않음)

- App Store / iOS 네이티브  
- 슬립 QR 인코딩 규칙 변경  
- Actions typecheck 버그 수정은 **선행 핫픽스**로 별도 (본 전환과 독립)

---

## 4. 단계별 계획

### Phase 0 — 선행 정리 (1일 이내, 전환 전)

| 작업 | 내용 | 완료 기준 |
|------|------|-----------|
| 0.1 | `EngagementNotificationSettings` typecheck 오류 수정 후 main 반영 | `tsc` 통과 |
| 0.2 | Functions `scheduledLottoSync*` 배포 여부·로그 확인 (콘솔) | 토요/일요 실행 기록 확인 |
| 0.3 | Firestore `appConfig/lottoSync.latestDrwNo`가 실서비스 회차와 일치하는지 확인 | 1237 등 최신 회차 |

**의존:** 0.1은 Actions를 당장 유지할 경우에도 필요. 전환 성공과 무관하게 먼저 권장.

---

### Phase 1 — Functions를 “공식 주간 경로”로 문서화·강화 (2~3일)

| 작업 | 내용 | 완료 기준 |
|------|------|-----------|
| 1.1 | sync 성공/스킵/실패를 Firestore `appConfig/lottoSyncMeta` 또는 로그 필드로 남김 (`lastAttemptAt`, `lastSuccessDrwNo`, `lastError`) | 콘솔·문서에서 상태 확인 가능 |
| 1.2 | 일요 09:00 외 **일요 21:00** 재시도 스케줄 추가 (Actions와 동일 백업) | `onSchedule` 배포 |
| 1.3 | 관리자/수동 트리거 HTTP (기존 admin API에 `POST .../lotto-sync/refresh` 등) | 수동으로 즉시 갱신 가능 |
| 1.4 | 운영 런북: “회차 안 올라올 때” 체크 순서 | docs에 짧은 절 |

**의도:** 새 인프라를 만들기보다, 이미 있는 Scheduler를 **신뢰 가능한 주 경로**로 격상.

---

### Phase 2 — 알림을 Functions로 이전 (3~5일) ✅ 2026-08-16

현재 Actions에서 데이터 변경 시에만 실행하던 것을 Functions로 이전함:

- `functions/lib/notifyWinners.mjs`
- `functions/lib/notifyDeviceWins.mjs`
- `functions/lib/notifyEngagement.mjs`
- 오케스트레이션: `runPostDrawNotifications` ← `scheduledLottoSync*` / 일요 재시도

| 작업 | 내용 | 완료 기준 |
|------|------|-----------|
| 2.1 | 공통 모듈을 `functions/lib/`로 이식 (또는 shared 패키지) | Functions에서 동일 로직 실행 |
| 2.2 | `scheduledLottoSyncHandler`에서 **번호 sync가 새로 갱신된 회차일 때만** 알림 체인 호출 | 중복 발송 방지 (`notifiedDrwNo` 저장) |
| 2.3 | Resend·FCM 시크릿을 Functions 환경설정으로 이전 | 시크릿이 Actions에만 의존하지 않음 |
| 2.4 | 알림 실패는 sync 성공을 롤백하지 않음 (`continue-on-error`와 동일) | sync OK + 알림 실패 로그 |

**위험:** 이중 발송 (Actions + Functions). Actions는 `run_notifications` 기본 off.

---

### Phase 3 — GitHub Actions 축소 (1~2일)

| 작업 | 내용 | 완료 기준 |
|------|------|-----------|
| 3.1 | `update-lotto-data.yml`에서 **schedule 트리거 제거** 또는 “데이터 커밋만 / deploy 없음”으로 변경 | 토요에 Hosting 풀배포 안 함 |
| 3.2 | (권장) 새 워크플로 `deploy-lotto.yml`: `main` push + path 필터 또는 `workflow_dispatch`만 배포 | 코드 배포와 주간 데이터 분리 |
| 3.3 | (선택) 월 1회 `lottoData.json` 번들 백업 커밋 — 앱 초기 번들 최신화 | 문서화 |
| 3.4 | Actions Secrets 중 주간 전용 의존 감소 안내 | README/이 문서 업데이트 |

**권장 최종 Actions 역할**

- ❌ 토요마다 `build:lotto` + `firebase deploy hosting`
- ✅ 코드 변경 시 typecheck + deploy  
- ✅ (선택) 월간 데이터 스냅샷 커밋

---

### Phase 4 — 클라이언트·캐시 정리 (2~3일, 병행 가능)

| 작업 | 내용 | 완료 기준 |
|------|------|-----------|
| 4.1 | `LottoDataContext` 우선순위 명시: Firestore → 로컬 캐시 → `/lotto-sync.json` → API | 주석 + 짧은 테스트 |
| 4.2 | Hosting `lotto-sync.json`은 **빌드 스냅샷(폴백)** 으로 위치 고정 | 문서에 “주간 최신은 Firestore” |
| 4.3 | (선택) Storage에 `lotto-sync.json` 업로드 후 Hosting rewrite — CDN 폴백 강화 | 필요 시만 |

**원칙:** 매주 Hosting 파일을 갈아엎지 않아도 앱이 최신 회차를 보도록 유지 (이미 방향이 맞음).

---

### Phase 5 — 관측·안정화 (지속)

| 작업 | 내용 |
|------|------|
| 5.1 | Cloud Logging 알림: sync 실패 N회 연속 시 메일/슬랙 |
| 5.2 | 토요 1~2회 수동 점검 체크리스트 (회차·당첨점·푸시) |
| 5.3 | 전환 후 2주간 Actions 스케줄과 이중 실행 여부 모니터링 |

---

## 5. 일정 (제안)

| 주차 | 내용 |
|------|------|
| W0 | Phase 0 (typecheck 핫픽스 + Functions 상태 확인) |
| W1 | Phase 1 + Phase 4.1~4.2 |
| W2 | Phase 2 (알림 이전, Actions 알림 off) |
| W3 | Phase 3 (Actions 스케줄 제거) + Phase 5 알림 |

토요 추첨 주간에 맞추면: **W1 토요 전에 Phase 1 배포**, **다음 토요에 Functions만으로 검증**, **그다음 주 Actions 스케줄 제거**.

---

## 6. 리스크와 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Functions 미배포/권한 부족 | 회차 미반영 | Phase 0.2 확인, 수동 refresh API |
| 알림 이중 발송 | 사용자 불만 | cutover 시 한쪽만 enable |
| Firestore만 갱신·번들 오래됨 | 오프라인/첫 페인트 지연 | 월간 번들 백업, 캐시 merge 유지 |
| Blaze 과금 | 비용 | 토요 폴링만 — 호출 수는 제한적, 예산 알람 |
| Scheduler 타임존/크론 | 놓침 | 기존 Sat20~22 + Sun 유지, Meta 로그 |
| typecheck가 Actions에 남아 배포 막음 | 코드 배포 실패 | 배포 CI와 데이터 CI 분리 (Phase 3) |

---

## 7. 성공 기준

1. **토요 추첨 후 2시간 이내** Firestore `lottoSync.latestDrwNo` = 최신 회차 (Hosting 재배포 없이)  
2. 앱(웹/TWA)에서 새로고침 시 최신 회차·당첨확인 동작  
3. 당첨/참여 알림이 Functions 경로로 1회만 발송  
4. GitHub에 **주간 “All jobs failed” 메일**이 typecheck 때문에 나오지 않음 (스케줄 배포 제거 또는 분리)  
5. 코드 배포는 기존처럼 `release:lotto --deploy` 또는 전용 CI로 가능  

---

## 8. 롤백

1. Actions `update-lotto-data.yml` 스케줄·deploy 스텝 복구  
2. Functions 알림 export만 비활성 (sync 스케줄은 유지해도 무방)  
3. 필요 시 로컬 `node scripts/update-lotto-data.mjs` + `release:lotto --deploy`로 응급 배포  

Firestore `appConfig/lottoSync`는 롤백해도 해가 적음 (클라이언트가 max merge).

---

## 9. 결정 필요 사항 (구현 전 확인)

1. **알림까지 Functions로 옮길지**, 1단계는 sync만 Functions / 알림은 당분간 Actions 유지할지  
2. Actions 스케줄을 **완전 삭제**할지, **데이터 커밋만** 남길지  
3. `lottoData.json` 월간 번들 갱신을 할지 말지  

기본 제안: **1=알림도 Functions(Phase 2)**, **2=스케줄 삭제**, **3=월 1회 선택**.

---

## 구현 진행 (2026-08-16)

- [x] 클라이언트: 동행복권 API 다음 회차 즉시 probe + 토요 45초 폴링
- [x] Functions: 20:35~ 매분 폴링, `lottoSyncMeta`, 일요 21:00 재시도
- [x] Actions: **토요 스케줄 제거** (수동 workflow_dispatch만)
- [x] 배포: Hosting `2026-08-15T22:41:32Z` + Functions(Sat20/21/22, Sun09/21)
- [x] Phase 2: 알림 Functions 이전 (`runPostDrawNotifications`, `notifiedDrwNo`)
- [x] Actions 알림 기본 off (`run_notifications` 비상 전용)
