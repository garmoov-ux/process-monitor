---
trigger: always_on
---

# 코드베이스 구조 및 컴포넌트 모듈화 규칙

## 1. 1파일 1책임 (Single Responsibility) 및 모듈 단위 개발 원칙
코드가 짧더라도 한 파일에 여러 컴포넌트나 비즈니스 로직을 몰아넣지 않고, 역할별로 명확히 분리된 모듈/컴포넌트 단위로 개발한다.

### 파일 및 함수 크기 제한
- **UI 컴포넌트 (`.tsx`)**: 권장 200행 이내 (최대 300행 이내 -> 하위 컴포넌트 및 커스텀 훅으로 분리)
- **비즈니스/서비스 모듈 (`.ts`)**: 권장 200행 이내 (최대 300행 이내 -> 탐지기, 상태 머신, 실행기, 리포지토리로 분리)
- **단일 함수 본문**: 권장 40행 이내 (최대 80행 이내)

## 2. 표준 디렉터리 및 모듈 아키텍처

```plaintext
src/
├── shared/                       # Main과 Renderer가 공유하는 순수 타입, 상수, IPC 채널 규격
│   ├── types/                    # 도메인 모델(프로세스 타겟, 상태 머신, 이벤트 이력, NTP, 설정, 통계 타입)
│   └── ipc-channels.ts           # 타입 안전한 IPC 채널명 정의
├── main/                         # Electron Main 프로세스 (Node.js 환경)
│   ├── index.ts                  # 앱 생명주기, 단일 인스턴스 락, 창/트레이 초기화
│   ├── tray.ts                   # 작업표시줄 트레이 아이콘 및 우클릭 컨텍스트 메뉴
│   ├── config/                   # 포터블 경로 해석(app-paths) 및 config.json 원자적 읽기/쓰기
│   ├── db/                       # SQLite(better-sqlite3) 초기화, 스키마, Repository
│   │   ├── connection.ts         # WAL 모드, pragma 설정, DB 연결 싱글톤
│   │   ├── schema.ts             # process_targets, process_events, ntp_history, daily_stats DDL
│   │   ├── process-repo.ts       # 프로세스 이벤트 이력 저장/검색, 가동률 통계 집계
│   │   └── ntp-repo.ts           # NTP 동기화 이력 저장 및 성공/실패 집계
│   ├── watchdog/                 # 다중 프로세스 모니터링 및 상태 머신 엔진
│   │   ├── process-scanner.ts    # 실행 중인 윈도우/프로세스 배치 스캔 (PID, 경로, 타이틀, 응답여부)
│   │   ├── process-controller.ts # 프로세스 기동(spawn), 단계별 종료(WM_CLOSE -> taskkill /F /T)
│   │   ├── state-machine.ts      # 개별 프로세스 유예/대기/응답없음/서킷브레이커 상태 전이 관리
│   │   ├── watchdog-scheduler.ts # 주기적 스캔 루프, 전체 점검 모드, 트레이 숨김 시 브로드캐스트 최적화
│   │   ├── boot-scheduler.ts     # Windows 작업 스케줄러(schtasks) 부팅 자동 실행 등록/해제
│   │   ├── file-logger.ts        # 일자별 system / process 로그 기록기
│   │   └── retention-cleaner.ts  # 오래된 로그 파일 및 DB 이력 자동 정리기
│   ├── ntp/                      # 다중 NTP 시간 동기화 엔진
│   │   ├── sntp-client.ts        # UDP 123 포트 SNTP 패킷 쿼리 및 1/2/3차 서버 Failover
│   │   └── ntp-scheduler.ts      # 주기적 시간 동기화, 최대 오차 안전장치, Windows 시스템 시간 반영
│   ├── report/                   # 보고서 생성기
│   │   └── pdf-report-generator.ts # 가동률 및 장애 이력 PDF/CSV 보고서 출력
│   └── ipc/                      # 도메인별 IPC 핸들러 등록
├── preload/                      # ContextBridge 보안 브릿지
│   └── index.ts                  # window.processMonitorApi 노출
└── renderer/                     # React 19 + Tailwind CSS v4 프론트엔드
    ├── assets/fonts/             # Pretendard 오프라인 폰트 (.woff2)
    ├── components/
    │   ├── ui/                   # 원자적 공통 UI (PillButton, UtilityCard, OptionChip, SearchInput)
    │   └── layout/               # GlobalNav, StatusFooter
    ├── features/
    │   ├── dashboard/            # 실시간 감시 요약 히어로 타일, 프로세스 관제 테이블, 개별 제어 액션
    │   ├── targets/              # 프로세스 추가/편집 모달 (실행 중 프로세스 선택 탭 / 파일 직접 지정 탭)
    │   ├── history/              # 프로세스 장애/재시작 및 NTP 동기화 이력 조회 화면
    │   ├── logs/                 # 실시간 이벤트 로그 뷰어 및 필터링 화면
    │   ├── stats/                # 프로세스별 가동률(Uptime %) 및 일별/월별 재시작 통계 차트
    │   ├── settings/             # 애플 시스템 환경설정 스타일 설정 화면 (감시 주기, NTP 1/2/3차 서버, 부팅 등록)
    │   └── about/                # 프로그램 정보 화면
    ├── hooks/                    # IPC 구독 및 상태 관리 커스텀 훅
    └── styles/                   # DESIGN.md 토큰 및 Pretendard 기반 글로벌 스타일
```
