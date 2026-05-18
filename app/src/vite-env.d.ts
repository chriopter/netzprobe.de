/// <reference types="vite/client" />

declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;
declare const __BUILD_COMMITS__: { sha: string; short: string; date: string; subject: string; body: string }[];
declare const __BUILD_OLDER_DAYS__: { key: string; label: string; count: number }[];

declare module '*.md?raw' {
  const content: string;
  export default content;
}
