# ProcessMonitor 프로젝트 작업 및 코딩 아키텍처 표준 규칙 (AGENTS.md)

본 문서는 `ProcessMonitor` 워크스페이스의 마스터 지침서이며, 세부 분야별 규칙은 `.agents/rules/` 하위 6개 규칙 파일과 `DESIGN.md` 및 `code_artifact.md`를 따른다.

## 0. 세부 규칙 파일 참조 체계 (`.agents/rules/`)
1. **`architecture-and-spec.md`**: Windows 다중 프로세스 탐지(`execPath` + `processName`), 독립 상태 머신(유예 시간, 단계별 종료 `WM_CLOSE` -> `taskkill /F /T`, 응답 없음 Hung 감지, 서킷 브레이커), UDP 123 포트 다중 NTP 시간 동기화 명세
2. **`codebase-and-components.md`**: 1파일 1컴포넌트/1모듈 원칙, 파일/함수 줄 수 제한, `main` / `preload` / `renderer` / `shared` 폴더 아키텍처
3. **`design-system.md`**: `DESIGN.md`(Apple Design System) 기반 컬러(`#0066cc`, `#f5f5f7`, `#1d1d1f`, `#272729`), 고정 뷰포트(`h-screen overflow-hidden`), Pretendard 오프라인 내장 폰트, 100% 한글화 UI 규칙
4. **`security-and-env.md`**: `.env` / `.env.example` 환경변수 분리, Electron `contextIsolation: true`, 외부 프로세스 `spawn` 인자 배열 검증, SQLite Prepared Statement 및 `WAL` 모드 보안 규칙
5. **`testing-and-verification.md`**: 프로세스 상태 머신(단조 증가 시간 기준), 다중 NTP Failover 및 오차 한계 검증, 원자적 설정 저장(`config.json`), 인메모리 SQLite 테스트, 빌드 검증 절차
6. **`git-workflow.md`**: `<type>(<scope>): <한글 커밋 요약>` 커밋 컨벤션, 자율 브랜치 운용/병합/푸시 자동화 및 저장소 보안 규칙

## 1. 언어 및 커뮤니케이션 스타일
- 모든 설명, 코드 주석, 보고서(Artifact), 커밋 메시지 요약은 한국어로 작성한다.
- 문서와 코드 주석에는 이모지(Emoji)를 사용하지 않는다.
- 화면 UI에는 영문 기술 용어(`SQLite`, `PID`, `Hung`, `Circuit Breaker`, `Offset`, `Timeout` 등) 대신 직관적인 순수 한글 레이블(`내장 데이터베이스`, `프로세스 번호`, `응답 없음`, `연속 실패 차단`, `시간 오차`, `대기 시간` 등)을 우선 사용한다.
- 불필요한 서론을 줄이고 핵심 결론과 실행 가능한 코드/결과물 위주로 간결하게 답변한다.

## 2. 도메인 핵심 원칙 (무인 프로세스 감시 및 시간 동기화 무결성)
- 각 등록 프로세스는 전체 감시 루프를 블로킹하지 않고 개별 상태 머신(`정상 가동`, `구동 유예 중`, `미감지(재시작 대기)`, `응답 없음 감지`, `종료 처리 중`, `차단됨(연속 실패)`, `감시 일시정지`, `경로 오류`)으로 동작한다.
- NTP 시간 보정으로 시스템 시계가 변경되더라도 상태 머신 타이머가 영향받지 않도록 모든 대기/유예 시간은 단조 증가 시계(`process.hrtime.bigint()`)를 기준으로 계산한다.
- 정전이나 강제 전원 차단 시에도 `config.json`이 손상되지 않도록 임시 파일 기록 후 교체하는 원자적 쓰기(Atomic Write)를 적용한다.
- 창이 트레이로 숨겨진 상태에서는 Renderer로의 주기적 IPC 브로드캐스트를 일시 중단하여 24시간 365일 무인 구동 시 메모리 누수와 CPU 점유를 방지한다.

## 3. 컴포넌트 및 모듈 단위 개발 원칙
- 한 파일에 여러 컴포넌트나 비즈니스 로직을 몰아넣지 않고, 원자적 UI 컴포넌트(`components/ui/`), 레이아웃(`components/layout/`), 도메인 기능(`features/`), 백엔드 서비스(`watchdog/`, `ntp/`, `db/`, `config/`)로 모듈화하여 개발한다.
- UI 컴포넌트(`.tsx`) 및 서비스 모듈(`.ts`)은 권장 200행(최대 300행) 이내, 단일 함수는 권장 40행(최대 80행) 이내로 유지한다.
