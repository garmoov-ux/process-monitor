# 프로세스 모니터링 및 제어 시스템 개발 요구사항 정의서

## 1. 프로젝트 개요
* **프로젝트명:** Windows 기반 다중 프로세스 모니터링 및 자동 복구 시스템 (`ProcessMonitor` / Watchdog)
* **목적:** 지정된 핵심 프로그램들의 구동 상태를 실시간 감시하여 비정상 종료 및 응답 없음(Hung) 발생 시 자동으로 재실행하고, 다중 NTP 서버를 통해 시스템 시간을 동기화하여 무인/현장 환경의 24시간 365일 운영 안정성을 확보함.
* **대상 운영체제:** Windows 10 / Windows 11 (64-bit)
* **표준 기술 스택:**
  * **코어 프레임워크:** Electron 34 + `electron-vite` 3 (Main / Preload / Renderer 3계층 격리 아키텍처)
  * **언어 및 런타임:** TypeScript 5.7 (`strict: true`) + Node.js 22
  * **프론트엔드 UI:** React 19 + Tailwind CSS v4 + `lucide-react` + 오프라인 내장 `Pretendard` (`.woff2`) 폰트
  * **내장 데이터베이스:** `better-sqlite3` (`WAL` 모드) — 프로세스 기동/종료/장애 이력, 일별 가동률 통계, NTP 동기화 이력 영구 저장
  * **인코딩 및 OS 연동:** `iconv-lite` (`CP949` 한글 프로세스/창 타이틀 디코딩), Node.js `dgram` (UDP 123 포트 SNTP 패킷 쿼리), Windows `tasklist` / `taskkill` / `schtasks`
  * **테스트 및 패키징:** `Vitest` (단위/통합 테스트 및 인메모리 SQLite 검증), `electron-builder` (Windows 설치형 및 포터블 `.exe` 빌드)

---

## 2. 핵심 기능 요구사항

### 2.1. 프로세스 탐지 및 목록 관리
* **다중 프로세스 등록 및 관리:** 여러 개의 대상 프로그램을 목록(Table/Card) 형태로 등록, 수정, 삭제, 개별 감시 활성화/비활성화할 수 있어야 함.
* **프로세스 등록 방식 (2가지 모두 지원):**
  1. **실행 중인 프로세스 선택:** 현재 실행 중인 윈도우/프로세스 목록을 조회하여 선택 시 프로세스명(`processName`), 창 타이틀(`windowTitle`), 실행 파일 전체 경로(`execPath`), 기본 작업 폴더(`workDir`)가 자동 입력되는 기능.
  2. **수동 파일 지정:** 파일 탐색기를 통해 `.exe` 경로를 직접 지정하고 실행 인자(`args`), 작업 폴더(`workDir`), 창 표시 모드(`windowStyle`: 기본/최소화/숨김)를 수동 입력하는 기능.
* **프로세스 식별 및 저부하 스냅샷 기준:**
  * 창 타이틀(`MainWindowTitle`)은 프로그램 상태에 따라 변경될 수 있으므로 **실행 파일 전체 경로(`execPath`, 대소문자 무시 정규화) 및 프로세스명(`processName`)**을 기본 식별자(Primary Key)로 사용.
  * 런처(Launcher) 구조처럼 실행 파일과 실제 상주 프로세스명이 다른 경우를 위해 `watchProcessName`(감시 대상 프로세스명) 별도 지정 옵션 지원.
  * 창 타이틀은 UI 표시 및 응답 없음(`Responding`) 판정의 보조 식별 수단으로 활용.
  * 스캔 시 매 주기마다 무거운 프로세스를 남발하지 않도록 단일 배치 스냅샷 쿼리(`iconv-lite` `CP949`/`UTF-8` 변환 포함)로 전체 대상 프로세스의 `PID`, `메모리 사용량`, `창 타이틀`, `응답 상태(Responding)`를 한 번에 수집.

### 2.2. 개별 대기 시간(Delay) 및 종료/실행 제어
* **독립 상태 머신(State Machine) 운영:**
  * 각 프로세스는 전체 루프에 영향을 주지 않고 개별 타이머와 상태(`정상 가동`, `구동 유예 중`, `미감지(재시작 대기)`, `응답 없음 감지`, `종료 처리 중`, `차단됨(연속 실패)`, `감시 일시정지`, `경로 오류`)로 독립 동작해야 함.
  * **단조 증가 시간(Monotonic Clock) 기반 타이머:** NTP 시간 동기화로 시스템 시계가 과거/미래로 점프하더라도 유예 시간이나 카운트다운이 왜곡되지 않도록 모든 타이머와 가동 시간 계산은 `process.hrtime.bigint()` (또는 `performance.now()`)를 기준으로 산출.
* **개별 타이머 설정 항목:**
  * **종료/재시작 대기 시간 (`restartDelaySec`):** 프로세스 미감지 또는 재시작 명령 시 지정된 시간(초)만큼 카운트다운 후 실행 수행.
  * **초기 구동 유예 시간 (`startupGraceSec`):** 프로그램 실행 직후 초기화 및 메인 창 생성까지 걸리는 시간(초) 동안은 미응답 및 재시작 판정을 보류.
  * **정상 종료 대기 시간 (`gracefulTimeoutSec`):** 정상 종료 시그널 전송 후 강제 종료까지 기다리는 유예 시간(기본 5초).
* **단계별 종료 프로세스:**
  1. **정상 종료 유도 (Graceful Shutdown):** 종료 요청 시 메인 윈도우 종료 메시지(`WM_CLOSE` / `taskkill /PID <pid>`) 전송 후 `gracefulTimeoutSec`(예: 5초) 대기.
  2. **강제 종료 (Force Kill):** 유예 시간 경과 후에도 프로세스가 남아 있을 경우 하위 자식 프로세스 트리까지 강제 종료(`taskkill /F /T /PID <pid>`).
* **비정상 멈춤(Not Responding / Hung) 감지:**
  * 프로세스는 존재하나 윈도우 메시지 루프가 멈춘 상태(`Responding == false`)가 지정된 임계 횟수(`hungThresholdCount`, 예: 3회 연속) 지속될 경우 강제 종료 후 재실행하는 옵션 제공.
* **무한 재시작 방지 (Circuit Breaker):**
  * 설정 오류나 치명적 크래시로 인해 지정된 시간 창(`retryWindowSec`, 예: 180초) 내에 최대 허용 횟수(`maxRetriesInWindow`, 예: 5회) 이상 재시작 실패 시, 해당 프로세스 상태를 `차단됨(연속 실패)`으로 전환하여 자동 재시작을 일시 중지하고 경고 배너 및 에러 로그를 기록.

### 2.3. NTP 다중 시간 동기화
* **사용 유무 설정:** NTP 동기화 기능 전체 활성화/비활성화 토글 지원.
* **순수 UDP(포트 123) SNTP 쿼리 및 다중 서버 Failover (1차 / 2차 / 3차):**
  * Windows `w32tm` 서비스 비활성화 환경에서도 동작하도록 Node.js `dgram` 기반 UDP 123 포트 SNTP 패킷으로 직접 시간 오차(Offset) 및 왕복 지연 시간(RTT)을 측정.
  * 사용자가 1차, 2차, 3차 NTP 서버 주소(도메인 또는 IP)를 설정 가능하며, 1차 서버 통신 실패(Timeout) 시 즉시 2차 -> 3차 서버 순으로 Failover 수행.
* **동기화 주기 및 안전장치:**
  * 설정된 주기(분 단위) 자동 동기화 및 UI 내 `[즉시 동기화 테스트]` 버튼 지원.
  * **시간 급변 방지 (`maxOffsetLimitSec`):** 원격 서버 오류 등으로 로컬 시간과 과도한 오차(예: 설정값 3,600초 이상) 발생 시 시스템 시간 변경을 보류하고 경고 로그를 남기는 안전장치 포함.
  * 검증 통과 시 관리자 권한을 통해 Windows 시스템 시각(`SetSystemTime` / `Set-Date`) 즉시 반영.

### 2.4. 로그(Logging), 내장 DB(`SQLite`) 및 통계(Statistics)
* **파일 로그 및 SQLite 이중 기록 아키텍처:**
  * **일자별 파일 로그 (`logs/YYYYMMDD_process.log`, `logs/YYYYMMDD_system.log`):** 프로세스 기동/종료/강제종료/재실행, 응답 없음 감지, NTP 동기화 결과, 설정 변경 이력을 텍스트 로그로 실시간 기록하며 보관 기간(`logRetentionDays`, 기본 30일) 경과 파일 자동 정리.
  * **내장 데이터베이스 (`data/app.db`, SQLite `WAL` 모드):**
    * `process_targets`: 감시 대상 프로세스 설정 및 누적 기동/재시작 메타데이터
    * `process_events`: 이벤트 유형(`START`, `STOP`, `CRASH`, `HUNG_KILL`, `RESTART`, `CIRCUIT_OPEN`), 발생 시각, PID, 상세 메시지
    * `ntp_history`: 동기화 시각, 응답 서버, 측정 오차(ms), 왕복 지연(ms), 적용 성공 여부
    * `daily_stats`: 일자별·프로세스별 정상 가동 시간(초), 장애 횟수, 가동률(Uptime %) 집계
* **통계 대시보드 및 보고서 내보내기:**
  * 프로세스별 실시간 가동 시간(Uptime %), 누적 재시작 횟수, 메모리 점유량, 최근 장애 시각 표시.
  * 일별/월별 프로세스 재시작 빈도 차트, NTP 동기화 성공/실패 요약, CSV(`CP949`/`UTF-8-SIG`) 및 PDF 점검 보고서 출력 지원.

### 2.5. 시스템 권한 및 운영 편의 기능
* **관리자 권한(UAC) 획득 및 부팅 자동 실행:**
  * 타 프로세스 제어(`taskkill`) 및 시스템 시간 변경을 위해 애플리케이션 패키징 시 `requestedExecutionLevel: requireAdministrator` 매니페스트 적용.
  * Windows 부팅 시 UAC 팝업 없이 백그라운드/포그라운드로 즉시 기동되도록 **Windows 작업 스케줄러(`schtasks /Create /RL HIGHEST /SC ONLOGON`) 자동 등록/해제 옵션** 지원.
* **자체 보호 및 현장 작업 편의성:**
  * **중복 실행 방지:** 모니터링 프로그램 자체가 2개 이상 실행되지 않도록 `app.requestSingleInstanceLock()` 적용 (중복 실행 시도 시 기존 창을 트레이에서 복원 및 포커스).
  * **시스템 트레이(Tray) 연동:** 창 닫기(X) 클릭 시 프로세스가 종료되지 않고 트레이 아이콘으로 숨겨지며(`window.hide()`), 완전 종료는 트레이 우클릭 메뉴(`프로그램 완전 종료`)를 통해서만 가능하도록 처리.
  * **전체 점검 모드 (Maintenance Mode):** 현장 작업자가 대상 프로그램을 수동 패치/업데이트할 때 워치독이 강제로 다시 켜는 현상을 막기 위해, 상단 네비게이션 및 트레이 메뉴에 **`전체 감시 일시정지(점검 모드)`** 원클릭 토글 제공.

---

## 3. 환경 설정 파일 규격 (Configuration)

* **파일 포맷 및 경로:** 포터블 배포 및 백업 편의성을 위해 실행 파일 기준 경로의 `config.json` 및 `.env` 환경변수 주입을 지원하며, SQLite DB와 실시간 동기화.
* **파일 손상 방지 (Atomic Write):** 갑작스러운 전원 차단(정전)으로 설정 파일이 깨지는 것을 막기 위해 `config.json.tmp`에 먼저 기록 및 디스크 플러시(`fsync`) 후 원본 파일로 원자적 교체(`rename`) 적용.

### `config.json` 데이터 구조 명세
```json
{
  "system": {
    "runOnBoot": true,
    "minimizeToTray": true,
    "startMinimized": false,
    "checkIntervalMs": 2000,
    "logRetentionDays": 30,
    "maintenanceMode": false
  },
  "ntp": {
    "enabled": true,
    "syncIntervalMin": 60,
    "timeoutMs": 2000,
    "maxOffsetLimitSec": 3600,
    "servers": [
      "time.bora.net",
      "time.kriss.re.kr",
      "pool.ntp.org"
    ]
  },
  "targets": [
    {
      "id": "proc_001",
      "name": "메인 제어 프로그램",
      "processName": "MainController.exe",
      "windowTitle": "MainController v1.0",
      "execPath": "C:\\App\\Controller\\MainController.exe",
      "args": "--mode=production",
      "workDir": "C:\\App\\Controller",
      "windowStyle": "normal",
      "enabled": true,
      "restartDelaySec": 5,
      "startupGraceSec": 15,
      "gracefulTimeoutSec": 5,
      "checkNotResponding": true,
      "hungThresholdCount": 3,
      "maxRetriesInWindow": 5,
      "retryWindowSec": 180
    }
  ]
}
```

---

## 4. UI/UX 화면 구성 (`DESIGN.md` Apple Design System 준수)

* **레이아웃 및 디자인 원칙:**
  * 고정 뷰포트(`h-screen overflow-hidden flex flex-col select-none`)를 적용하여 전체 창 스크롤을 금지하고 내부 테이블/로그 영역만 독립 스크롤 처리.
  * 단일 액센트 컬러 Action Blue(`#0066cc`), 오프화이트 캔버스(`#f5f5f7`), 화이트 유틸리티 카드(`#ffffff`, `rounded-[18px]`, `1px solid #e0e0e0`), 다크 요약 히어로 타일(`#272729`), 무그라데이션 원칙 적용.
  * 모든 화면 레이블과 상태 배지는 영문 개발 용어 대신 직관적인 **100% 한글 표현**(`정상 가동`, `구동 유예 중`, `응답 없음`, `점검 모드`, `시간 동기화` 등)을 사용하며 `whitespace-nowrap`으로 줄바꿈 깨짐 방지.
* **화면 구성 (5개 뷰):**
  1. **상단 글로벌 네비게이션 (`GlobalNav`) 및 상태 푸터 (`StatusFooter`):**
     * 감시 엔진 가동 상태(`실시간 감시 중` / `전체 점검 모드`), `[전체 감시 일시정지]` 토글 버튼, 현재 시스템 시각 및 최근 시간 동기화 오차(ms) 표시.
  2. **대시보드 및 프로세스 관제 (`DashboardView`):**
     * 상단 다크 히어로 요약 타일(전체 등록 수, 정상 가동 수, 재시작 대기/유예 수, 장애/차단 수, 최근 NTP 보정값).
     * 등록 프로세스 실시간 상태 테이블 (상태 배지, 프로그램명, 프로세스명/PID, 창 타이틀, 가동 시간, 누적 재시작 횟수, 카운트다운 타이머, 개별 `[시작]` / `[종료]` / `[재시작]` / `[편집]` 액션 버튼).
     * 프로세스 등록/편집 모달 (`실행 중인 프로그램에서 선택` 탭 / `직접 실행 파일 지정` 탭).
  3. **이력 조회 (`HistoryView`) 및 실시간 로그 (`RealtimeLogsView`):**
     * 프로세스 기동/종료/강제종료/서킷브레이커 이벤트 및 시간 동기화 이력 필터 검색, 로그 폴더 열기, CSV/PDF 내보내기.
  4. **통계 분석 (`MonthlyStatsView`):**
     * 프로세스별 가동률(Uptime %), 일별/월별 재시작 빈도 차트 및 시간 동기화 성공률 시각화.
  5. **환경 설정 (`SettingsView`):**
     * 애플 시스템 환경설정 스타일의 세그먼트 컨트롤 기반 설정 화면 (감시 주기, 부팅 시 자동 실행, 트레이 최소화, 1/2/3차 NTP 서버 및 `[즉시 동기화 테스트]` 버튼, 로그 보관 기간).

---

## 5. 비기능적 요구사항 (성능, 보안 및 안정성)
* **장기 구동 메모리 및 CPU 최적화:**
  * 24시간 365일 무인 가동 환경을 기준으로 창이 트레이로 숨겨진 상태(`!window.isVisible()`)에서는 Renderer로의 주기적 상태 브로드캐스트를 일시 중단하고, 창이 다시 열릴 때 즉시 최신 상태 스냅샷을 전송하여 백그라운드 CPU/메모리 점유율을 최소화할 것.
* **보안 및 프로세스 격리:**
  * Electron `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`를 강제하고 `preload`의 `contextBridge`에 정의된 명시적 API만 노출할 것.
  * 외부 프로세스 실행 시 `child_process.spawn` 및 인자 배열을 사용하여 명령어 주입(Command Injection)을 차단하고, 모든 SQLite 쿼리는 100% Prepared Statement를 사용할 것.
* **안전한 예외 처리:**
  * 대상 실행 파일이 경로에서 삭제되었거나 권한/디스크 문제로 실행 불가할 경우 워치독 자체가 중단되지 않고 해당 타겟 상태만 `경로 오류`로 전환 후 에러 로그를 기록할 것.
