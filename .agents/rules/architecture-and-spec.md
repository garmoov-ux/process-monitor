---
trigger: always_on
---

# ProcessMonitor 아키텍처 및 프로세스 감시/NTP 동기화 명세 규칙

본 규칙은 `code_artifact.md` 요구사항 정의서를 기준으로 Windows 다중 프로세스 감시 및 NTP 시간 동기화 엔진의 동작 규격을 정의한다.

## 1. 프로세스 탐지 및 식별 규격
1. **기본 식별자 (Primary Key)**:
   - 창 타이틀(`windowTitle`)은 프로그램 상태에 따라 변할 수 있으므로 **정규화된 실행 파일 전체 경로(`execPath`) 및 프로세스명(`processName`)**을 기본 식별자로 사용한다.
   - 런처(Launcher) 구조 프로그램을 위해 감시 대상 프로세스명(`watchProcessName`) 별도 지정 옵션을 지원한다.
2. **저부하 배치 스냅샷 수집**:
   - 설정된 주기(`checkIntervalMs`, 기본 `2000ms`)마다 개별 프로세스별로 외부 명령을 반복 호출하지 않고, 단일 배치 스냅샷 쿼리로 실행 중인 프로세스의 `PID`, `프로세스명`, `실행 경로`, `창 타이틀`, `응답 여부(Responding)`, `메모리 사용량`을 일괄 수집한다.
   - Windows 콘솔 출력의 한글 깨짐을 방지하기 위해 `iconv-lite`(`CP949` / `UTF-8`) 디코딩을 적용한다.

## 2. 독립 상태 머신 (State Machine) 및 프로세스 제어 로직
1. **프로세스별 8대 상태**:
   - `RUNNING` (`정상 가동`): 프로세스가 정상 실행 중이며 응답 상태가 양호함
   - `STARTUP_GRACE` (`구동 유예 중`): 기동 직후 `startupGraceSec` 동안 미감지/응답 없음 판정을 보류함
   - `RESTART_PENDING` (`재시작 대기`): 미감지 확인 후 `restartDelaySec` 카운트다운 진행 중
   - `HUNG_DETECTED` (`응답 없음 감지`): `Responding == false` 상태가 누적되는 중 (`hungThresholdCount` 도달 시 강제 재시작)
   - `STOPPING` (`종료 처리 중`): 정상 종료 유도 후 `gracefulTimeoutSec` 대기 중
   - `CIRCUIT_OPEN` (`차단됨(연속 실패)`): `retryWindowSec` 내 `maxRetriesInWindow`회 이상 재시작 실패로 자동 복구 일시 중단
   - `PAUSED` (`감시 일시정지`): 개별 비활성화 또는 전체 점검 모드(`maintenanceMode`) 활성화 상태
   - `INVALID_PATH` (`경로 오류`): 대상 실행 파일이 존재하지 않거나 접근 권한이 없는 상태
2. **단조 증가 시간 (Monotonic Clock) 필수 사용**:
   - 모든 카운트다운(`restartDelaySec`, `startupGraceSec`, `gracefulTimeoutSec`)과 가동 시간 측정은 NTP 시간 변경의 영향을 받지 않도록 `process.hrtime.bigint()`를 기준으로 계산한다.
3. **단계별 종료 (Graceful -> Force Kill)**:
   - 1단계(정상 종료): `taskkill /PID <pid>` (또는 `CloseMainWindow`) 전송 후 `gracefulTimeoutSec`(기본 5초) 대기
   - 2단계(강제 종료): 유예 시간 경과 후에도 종료되지 않으면 자식 프로세스 트리를 포함해 `taskkill /F /T /PID <pid>` 실행

## 3. 다중 NTP 시간 동기화 및 안전장치
1. **UDP 123 포트 SNTP 직접 쿼리 및 Failover**:
   - Node.js `dgram` 모듈로 48바이트 NTP 패킷을 구성하여 1차 서버(`servers[0]`)에 쿼리하고, 타임아웃(`timeoutMs`, 기본 2000ms) 또는 오류 발생 시 즉시 2차(`servers[1]`) -> 3차(`servers[2]`) 서버로 Failover한다.
2. **시간 급변 방지 (`maxOffsetLimitSec`)**:
   - 측정된 시간 오차 절대값이 `maxOffsetLimitSec`(기본 3,600초)을 초과하면 시스템 시계 반영을 거부하고 경고 로그 및 이력을 남긴다.
   - 허용 범위 내일 때만 Windows 시스템 시각을 갱신하고 보정 오차(ms)와 사용된 서버를 기록한다.

## 4. 일자별 운영 로그 및 설정 원자적 저장
- `./logs/YYYYMMDD_system.log`: 시스템 시작/종료, 전체 점검 모드 전환, NTP 동기화 요약 로그
- `./logs/YYYYMMDD_process.log`: 프로세스별 기동, 종료, 강제종료, 응답 없음, 서킷 브레이커 상세 로그
- `config.json` 저장 시 임시 파일(`config.json.tmp`)에 먼저 기록 및 플러시 후 원본 파일로 `rename`하는 원자적 쓰기(Atomic Write)를 수행한다.
