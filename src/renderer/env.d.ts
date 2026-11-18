import type { processMonitorApi } from '../preload/index'

declare global {
  interface Window {
    processMonitorApi: typeof processMonitorApi
  }
}

declare module '*.woff2' {
  const src: string
  export default src
}
