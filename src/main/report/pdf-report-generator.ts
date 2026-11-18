import { BrowserWindow, dialog } from 'electron'
import fs from 'fs'
import { MonitorStateSnapshot } from '@shared/types/domain'

export async function exportCsvReport(
  parentWindow: BrowserWindow | null,
  snapshot: MonitorStateSnapshot
): Promise<{ ok: boolean; filePath?: string; message: string }> {
  const defaultName = `ProcessMonitor_이력보고서_${new Date().toISOString().slice(0, 10)}.csv`
  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, {
        title: 'CSV 보고서 저장',
        defaultPath: defaultName,
        filters: [{ name: 'CSV 파일 (*.csv)', extensions: ['csv'] }]
      })
    : await dialog.showSaveDialog({
        title: 'CSV 보고서 저장',
        defaultPath: defaultName,
        filters: [{ name: 'CSV 파일 (*.csv)', extensions: ['csv'] }]
      })

  if (result.canceled || !result.filePath) {
    return { ok: false, message: '저장이 취소되었습니다.' }
  }

  const lines: string[] = [
    '발생시각,구분,대상프로그램,이벤트유형,프로세스번호,상세내용',
    ...snapshot.recentEvents.map((ev) => {
      const safeMsg = `"${(ev.message || '').replace(/"/g, '""')}"`
      const safeName = `"${(ev.targetName || '').replace(/"/g, '""')}"`
      return `${ev.createdAt},${ev.severity},${safeName},${ev.eventType},${ev.pid ?? ''},${safeMsg}`
    })
  ]

  const content = '\uFEFF' + lines.join('\r\n')
  fs.writeFileSync(result.filePath, content, 'utf-8')
  return {
    ok: true,
    filePath: result.filePath,
    message: 'CSV 보고서가 저장되었습니다.'
  }
}

export async function exportPdfReport(
  parentWindow: BrowserWindow | null,
  snapshot: MonitorStateSnapshot
): Promise<{ ok: boolean; filePath?: string; message: string }> {
  const defaultName = `ProcessMonitor_운영보고서_${new Date().toISOString().slice(0, 10)}.pdf`
  const saveRes = parentWindow
    ? await dialog.showSaveDialog(parentWindow, {
        title: 'PDF 보고서 저장',
        defaultPath: defaultName,
        filters: [{ name: 'PDF 문서 (*.pdf)', extensions: ['pdf'] }]
      })
    : await dialog.showSaveDialog({
        title: 'PDF 보고서 저장',
        defaultPath: defaultName,
        filters: [{ name: 'PDF 문서 (*.pdf)', extensions: ['pdf'] }]
      })

  if (saveRes.canceled || !saveRes.filePath) {
    return { ok: false, message: '저장이 취소되었습니다.' }
  }

  const printWin = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    const rowsHtml = snapshot.processes
      .map(
        (p) => `
        <tr>
          <td>${p.target.name}</td>
          <td>${p.target.processName}</td>
          <td>${p.state}</td>
          <td>${p.pid ?? '-'}</td>
          <td>${p.totalRestartCount}회</td>
          <td>${p.lastMessage}</td>
        </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: 'Malgun Gothic', sans-serif; color: #1d1d1f; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 6px; }
  p.sub { color: #7a7a7a; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
  th, td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; }
  th { background: #f5f5f7; font-weight: 600; }
</style>
</head>
<body>
  <h1>ProcessMonitor 프로세스 관제 및 시간 동기화 운영 보고서</h1>
  <p class="sub">생성 시각: ${new Date().toLocaleString('ko-KR')} | 등록 프로세스: ${snapshot.summary.totalTargets}개 | 정상 가동: ${snapshot.summary.runningCount}개</p>
  <table>
    <thead>
      <tr>
        <th>프로그램명</th>
        <th>프로세스명</th>
        <th>현재 상태</th>
        <th>프로세스 번호</th>
        <th>누적 재시작</th>
        <th>최근 상태 메시지</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="6">등록된 프로세스가 없습니다.</td></tr>'}</tbody>
  </table>
</body>
</html>`

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    })
    fs.writeFileSync(saveRes.filePath, pdfBuffer)
    return {
      ok: true,
      filePath: saveRes.filePath,
      message: 'PDF 운영 보고서가 저장되었습니다.'
    }
  } finally {
    if (!printWin.isDestroyed()) {
      printWin.close()
    }
  }
}
