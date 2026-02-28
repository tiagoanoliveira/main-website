// Tipos do ambiente Cloudflare Workers.
// Vars definidas em wrangler.jsonc ("vars") e secrets (wrangler secret put).
// Este ficheiro é necessário para que o TypeScript reconheça os campos do Env
// e o Wrangler os injete corretamente no bundle.

interface Env {
  // Bindings (wrangler.jsonc)
  DB: D1Database;
  UPLOADS: R2Bucket;

  // Vars públicas (wrangler.jsonc "vars")
  BASE_URL: string;

  // Secrets (wrangler secret put)
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  ADMIN_EMAIL: string;
  SESSION_SECRET: string;
}
