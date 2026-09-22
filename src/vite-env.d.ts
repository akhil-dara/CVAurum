/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module '*.icc?inline' {
  const src: string
  export default src
}
