---
trigger: always_on
---

# 테스트 및 품질 검증 규칙 (Testing & Verification)

## 1. 핵심 기능 단위 테스트 (`Vitest`) 필수
- **독립 프로세스 상태 머신 테스트**:
  - 단조 증가 시간(`process.hrtime.bigint()`) 기반으로 구동 유예(`startupGraceSec`), 재시작 대기(`restartDelaySec`), 응답 없음 연속 임계치(`hungThresholdCount`), 서킷 브레이커(`retryWindowSec` 내 `maxRetriesInWindow`회 실패 시 차단) 상태 전이가 정확히 동작하는지 검증한다.
- **다중 NTP Failover 및 오차 제한 테스트**:
  - 로컬 UDP 테스트 소켓을 이용해 1차 서버 타임아웃 시 2차/3차 서버 Failover가 동작하는지, `maxOffsetLimitSec`(예: 3600초) 초과 오차 발생 시 시간 변경을 거부하고 경고를 기록하는지 검증한다.
- **원자적 설정 저장(`config.json`) 및 SQLite 테스트**:
  - 임시 파일(`config.json.tmp`)을 통한 원자적 저장/복원과 인메모리 DB(`:memory:`) 기반의 프로세스 이벤트/NTP 이력/일별 가동률 집계 쿼리를 검증한다.

## 2. 구현 완료 전 필수 검증 절차 (Definition of Done)
코드를 수정하거나 기능을 구현한 뒤에는 반드시 아래 3단계를 실행하여 통과를 확인한다:
1. **타입 검사**: `npm run typecheck` (`tsc --noEmit`) 에러 0건
2. **단위/통합 테스트**: `npm test` (`vitest run`) 전체 통과
3. **빌드 및 패키징 검증**: `npm run build` (또는 `npm run dist:win`) 정상 빌드 확인
