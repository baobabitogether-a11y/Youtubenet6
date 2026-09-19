/// <reference types="vite/client" />

declare module '*.srt' {
  const content: string;
  export default content;
}

declare module '*.srt?raw' {
  const content: string;
  export default content;
}
