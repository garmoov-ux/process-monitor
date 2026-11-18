const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

function findRceditExe() {
  const localAppData = process.env.LOCALAPPDATA || ''
  const cacheDir = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign')
  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir)
    for (const entry of entries) {
      const candidate = path.join(cacheDir, entry, 'rcedit-x64.exe')
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }
  return null
}

function stampExecutable(exePath, iconPath) {
  const rcedit = findRceditExe()
  if (!rcedit || !fs.existsSync(exePath)) return

  const args = [
    exePath,
    '--set-version-string',
    'FileDescription',
    'Process Monitor - 다중 프로그램 자동 복구 및 시간 동기화',
    '--set-version-string',
    'ProductName',
    'Process Monitor - 다중 프로그램 자동 복구 및 시간 동기화',
    '--set-version-string',
    'CompanyName',
    '㈜이노네트웍스',
    '--set-version-string',
    'InternalName',
    'ProcessMonitor',
    '--set-version-string',
    'OriginalFilename',
    path.basename(exePath),
    '--set-requested-execution-level',
    'requireAdministrator'
  ]

  if (iconPath && fs.existsSync(iconPath)) {
    args.push('--set-icon', iconPath)
  }

  try {
    execFileSync(rcedit, args, { stdio: 'inherit', windowsHide: true })
  } catch (err) {
    console.warn('[afterPack] rcedit warning:', err.message)
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(context.appOutDir, exeName)
  const iconPath = path.resolve(context.packager.projectDir, 'resources', 'icon.ico')
  stampExecutable(exePath, iconPath)
}
