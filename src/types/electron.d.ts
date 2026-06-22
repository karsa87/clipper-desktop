export {}

declare global {
  interface Window {
    electron: {
      getAppVersion: () => Promise<string>
      openExternal: (url: string) => Promise<void>
      platform: string
    }
  }
}
