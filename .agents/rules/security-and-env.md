---
trigger: always_on
---

# 보안, Electron 프로세스 격리, SQLite 및 환경변수(.env) 규칙

## 1. 환경변수 (`.env` / `.env.example`) 관리 규칙
- 환경별 설정값은 `.env` 또는 실행 폴더의 `config.json`을 통해 주입할 수 있도록 구성한다.
- `.env` 파일은 절대 Git에 커밋하지 않으며(`.gitignore` 등록), `.env.example` 파일을 저장소 루트에 유지한다.
- Renderer 프로세스에는 `process.env`를 직접 노출하지 않으며, 검증된 설정값만 IPC를 통해 전달한다.

## 2. Electron 보안 아키텍처 및 외부 프로세스 실행 규칙
- `BrowserWindow` 생성 시 다음 보안 옵션을 적용한다:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `webSecurity: true`
- Renderer에서 Main 기능을 호출할 때는 `preload/index.ts`의 `contextBridge.exposeInMainWorld('processMonitorApi', ...)`에 정의된 명시적 함수만 사용한다.
- 감시 대상 프로그램 실행, `taskkill`, `schtasks` 호출 시 실행 경로(`execPath`), PID(양의 정수 검증), NTP 서버 호스트명을 엄격히 검증한 뒤 `child_process.spawn`(또는 `execFile`)의 인자 배열로 전달하여 명령어 주입(Command Injection)을 원천 차단한다.

## 3. SQLite (`better-sqlite3`) 보안 및 무결성 규칙
- 모든 SQL 쿼리는 100% Prepared Statement 및 바인딩 파라미터(`?` 또는 `@param`)만 사용한다.
- DB 연결 즉시 아래 Pragma를 실행한다:
  - `PRAGMA journal_mode = WAL;`
  - `PRAGMA synchronous = NORMAL;`
  - `PRAGMA foreign_keys = ON;`
  - `PRAGMA busy_timeout = 5000;`
- 대량 프로세스 이벤트 적재 및 일별 통계 갱신 시 `db.transaction(...)`을 사용하여 원자성과 속도를 보장한다.
