# ProcessMonitor

Windows 기반 다중 프로세스 실시간 감시·자동 복구(Watchdog) 및 다중 NTP 시간 동기화 데스크톱 애플리케이션 (Electron + React 19 + SQLite)

## 1. 주요 기능
- **다중 프로세스 감시 및 독립 상태 머신**: 실행 중인 프로세스 선택 또는 파일 직접 지정을 통해 대상을 등록하고, 개별 유예 시간(`startupGraceSec`), 재시작 대기 시간(`restartDelaySec`), 단계별 종료(`WM_CLOSE` -> `taskkill /F /T`), 응답 없음(`Hung`) 감지, 무한 재시작 방지(Circuit Breaker)를 독립 수행합니다.
- **다중 NTP 서버 시간 동기화**: 1차/2차/3차 NTP 서버 Failover(UDP 123 포트 SNTP) 및 과도한 시간 오차(`maxOffsetLimitSec`) 안전장치를 통해 현장 무인 PC의 시스템 시간을 정확하게 유지합니다.
- **내장 SQLite(`WAL` 모드) 및 일자별 로그**: 프로세스 기동/종료/장애 이력, 일별 가동률(Uptime %) 통계, 시간 동기화 이력을 SQLite DB와 일자별 로그 파일에 동시 기록하고 CSV/PDF 보고서 내보내기를 지원합니다.
- **무인 운영 편의 기능**: 관리자 권한(`requireAdministrator`) 구동, Windows 작업 스케줄러(`schtasks`) 부팅 자동 실행, 단일 인스턴스 락, 시스템 트레이 상주, 현장 점검용 전체 감시 일시정지(Maintenance Mode)를 지원합니다.

## 2. 기술 스택
- **Framework**: Electron 34 + `electron-vite` 3 + TypeScript 5.7
- **Frontend**: React 19 + Tailwind CSS v4 + `lucide-react` + `Pretendard` 오프라인 폰트 (`DESIGN.md` Apple Design System 적용)
- **Database & Native**: `better-sqlite3` (`WAL` 모드), `iconv-lite` (`CP949` 인코딩 처리), Node.js `dgram` (SNTP)
- **Testing & Packaging**: `Vitest` + `electron-builder`

## 3. 문서 구성
- [code_artifact.md](./code_artifact.md): 상세 시스템 개발 요구사항 정의서
- [AGENTS.md](./AGENTS.md): 프로젝트 아키텍처 및 코딩 표준 마스터 규칙
- [DESIGN.md](./DESIGN.md): UI/UX 디자인 시스템 명세
- `.agents/rules/`: 도메인 아키텍처, 컴포넌트 분리, 디자인 시스템, 보안, 테스트, Git 워크플로우 6대 세부 규칙
- `.agents/skills/`: Electron, SQLite, React 19, Tailwind v4, UI/UX, Playwright 프로젝트 로컬 스킬 세트
