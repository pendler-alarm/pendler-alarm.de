/// <reference types="vitest/globals" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// declare module '*.vue' {
//   import type { DefineComponent } from 'vue';

//   const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
//   export default component;
// }
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>
  >;
  export default component;
}
