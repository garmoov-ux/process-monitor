import React from 'react'
import { UtilityCard } from '../../components/ui/UtilityCard'

export const ProgramInfoView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <UtilityCard title="ProcessMonitor 시스템 개요">
          <div className="space-y-2.5 text-[13px] text-[#1d1d1f]">
            <p>
              <strong>제품명:</strong> ProcessMonitor (Windows 다중 프로세스 모니터링 및 자동 복구 시스템)
            </p>
            <p>
              <strong>버전:</strong> v1.0.0 (Electron 34 + React 19 + 내장 데이터베이스 WAL 모드)
            </p>
            <p>
              <strong>주요 목적:</strong> 현장 및 무인 운영 PC에서 핵심 프로그램들의 비정상 종료·응답 없음(멈춤)을 실시간 감지하여 자동 재실행하고, 다중 시간 동기화 서버를 통해 시스템 시계를 정밀하게 유지합니다.
            </p>
          </div>
        </UtilityCard>

        <UtilityCard title="독립 상태 머신 및 안전장치 규격">
          <ul className="space-y-2 text-[12.5px] text-[#1d1d1f] list-disc pl-4">
            <li>
              <strong>단조 증가 타이머:</strong> 시간 동기화로 시스템 시계가 변경되어도 유예/대기 카운트다운이 흔들리지 않습니다.
            </li>
            <li>
              <strong>단계별 종료:</strong> 정상 종료 시그널 전송 후 유예 시간 경과 시에만 하위 자식 프로세스 트리를 강제 종료합니다.
            </li>
            <li>
              <strong>무한 재시작 방지:</strong> 지정된 시간 창 내 최대 재시작 횟수 초과 시 자동 복구를 일시 차단하고 경고를 남깁니다.
            </li>
            <li>
              <strong>원자적 설정 저장:</strong> 갑작스러운 정전 시에도 임시 파일 플러시 후 교체 방식으로 설정 파일 손상을 방지합니다.
            </li>
          </ul>
        </UtilityCard>
      </div>
    </div>
  )
}
