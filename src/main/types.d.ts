declare module 'screenshot-desktop' {
  interface ScreenshotOptions {
    filename?: string
    format?: string
    screen?: number
  }
  function screenshot(options?: ScreenshotOptions): Promise<Buffer | string>
  export = screenshot
}
