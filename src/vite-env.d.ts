// The VITE_ variables the app reads (see .env/.env.development), typed so a typo is a compile error.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
