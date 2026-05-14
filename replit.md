# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### 로또 분석·예측 (lotto-app)
- **Path**: `artifacts/lotto-app/`
- **Preview**: `/` (root)
- **Type**: React + Vite frontend-only app

**Features:**
- 1~1129회 실제 당첨 데이터 내장 (from Excel file)
- 동행복권 API 자동 업데이트 (via /api/lotto-proxy)
- 번호별 출현 빈도 차트, 합계 분포, 홀짝 비율, 고저 비율 통계
- 번호 생성기 3가지 모드: 균형 필터, AI 가중치, 순수 랜덤
- 공 굴러가는 애니메이션 (framer-motion)
- 이미지 저장 (html2canvas), Web Share API 공유
- 모바일 최적화 반응형 UI, 화이트/골드 테마

**Key Files:**
- `src/data/lottoData.json` — 1~1129회 당첨 데이터
- `src/data/types.ts` — TypeScript 타입 정의
- `src/utils/analysis.ts` — 통계 분석 함수
- `src/utils/generator.ts` — 번호 생성 알고리즘
- `src/utils/lottoApi.ts` — 동행복권 API + localStorage 캐싱
- `src/hooks/useLottoData.ts` — 데이터 통합 React 훅
- `src/pages/Dashboard.tsx` — 메인 대시보드
- `src/pages/Analysis.tsx` — 통계 분석
- `src/pages/Generator.tsx` — 번호 생성기
- `src/components/LottoBall.tsx` — 로또 공 컴포넌트
- `src/components/Navigation.tsx` — 네비게이션 바

### API Server
- **Path**: `artifacts/api-server/`
- **Routes**: `/api/*`
- **Type**: Express 5 + TypeScript

**Routes:**
- `GET /api/healthz` — 헬스 체크
- `GET /api/lotto-proxy?drwNo={n}` — 동행복권 API CORS 프록시

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (available but not used by lotto-app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
