declare module 'stackedit-js' {
  export type StackeditFile = {
    name?: string
    content: {
      text: string
    }
  }

  export default class Stackedit {
    openFile(file: StackeditFile): void
    on(event: 'fileChange', handler: (file: StackeditFile) => void): void
  }
}
