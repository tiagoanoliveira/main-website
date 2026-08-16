interface Env extends Cloudflare.Env {
  RESEND_API_KEY?: string;
  FROM_EMAIL: string;
  ADMIN_EMAIL?: string;
  SECRET_KEY?: string;
}
