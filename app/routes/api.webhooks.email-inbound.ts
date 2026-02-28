// POST /api/webhooks/email-inbound
// Recebe emails inbound do Resend e cria ticket_messages.
//
// Configurar no Resend Dashboard → Receiving → Webhooks:
//   URL:    https://tiagoanoliveira.pt/api/webhooks/email-inbound
//   Evento: email.received
//   Secret: guardar como wrangler secret put RESEND_WEBHOOK_SECRET

import type { Route } from "./+types/api.webhooks.email-inbound";

// ── Verificação de assinatura (formato Svix usado pelo Resend) ────────────

async function verifySignature(
  headers: Headers,
  rawBody: string,
  secret: string
): Promise<boolean> {
  const msgId        = headers.get("svix-id");
  const msgTimestamp = headers.get("svix-timestamp");
  const msgSignature = headers.get("svix-signature");
  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Rejeitar timestamps com mais de 5 minutos
  const ts = Number(msgTimestamp);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;

  // O secret vem no formato "whsec_<base64>"
  const b64 = secret.replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // svix-signature pode ter múltiplos valores: "v1,aaa v1,bbb"
  return msgSignature.split(" ").some((s) => s.replace("v1,", "") === computed);
}

// ── Limpar corpo do email (remover citações e assinaturas) ───────────────

function cleanEmailBody(body: string): string {
  const cleaned: string[] = [];
  for (const line of body.split("\n")) {
    const t = line.trimStart();
    if (
      t.startsWith(">") ||
      /^On .+ wrote:$/i.test(t) ||
      t.startsWith("--- ") ||
      t.startsWith("________")
    ) break;
    cleaned.push(line);
  }
  return cleaned.join("\n").trim();
}

// ── Tipos do payload Resend ────────────────────────────────────────────

interface ResendInboundPayload {
  type: string;
  data: {
    email_id: string;
    from:     string;
    to:       string[];
    subject?: string;
    text?:    string;
    html?:    string;
    attachments?: Array<{
      filename:     string;
      content_type: string;
      content:      string; // base64
    }>;
  };
}

interface InboundEnv extends Env {
  RESEND_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?:        string;
  ADMIN_EMAIL?:           string;
  FROM_EMAIL?:            string;
  BASE_URL?:              string;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const env     = context.cloudflare.env as InboundEnv;
  const rawBody = await request.text();

  // Verificar assinatura (obrigatório em produção)
  if (env.RESEND_WEBHOOK_SECRET) {
    const valid = await verifySignature(request.headers, rawBody, env.RESEND_WEBHOOK_SECRET);
    if (!valid) {
      console.error("Webhook signature inválida");
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    console.warn("⚠️  RESEND_WEBHOOK_SECRET não definido — assinatura não verificada");
  }

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Ignorar outros tipos de eventos
  if (payload.type !== "email.received") {
    return new Response("OK");
  }

  const { from, to, text, html, attachments = [] } = payload.data;
  const toAddress = Array.isArray(to) ? to[0] : to;

  // Extrair ticket ID do endereço de destino: ticket-42@garoorexia.resend.app
  const ticketMatch = toAddress?.match(/^ticket-(\d+)@/i);
  if (!ticketMatch) {
    console.log("Email inbound sem ticket ID — ignorado:", toAddress);
    return new Response("OK");
  }

  const ticketId = Number(ticketMatch[1]);
  const db       = env.DB;

  // Verificar se o ticket existe
  const ticket = await db
    .prepare("SELECT id, client_name, client_email, public_token FROM tickets WHERE id = ?")
    .bind(ticketId)
    .first<{ id: number; client_name: string; client_email: string; public_token: string }>();

  if (!ticket) {
    console.warn("Ticket não encontrado:", ticketId);
    return new Response("OK");
  }

  // Validar que o remetente é o cliente do ticket
  const fromEmail = from.replace(/.*<(.+)>/, "$1").trim().toLowerCase();
  if (ticket.client_email.toLowerCase() !== fromEmail) {
    console.warn(`Remetente (${fromEmail}) não corresponde ao cliente do ticket (${ticket.client_email})`);
    return new Response("OK");
  }

  // Extrair e limpar o corpo
  let body = "";
  if (text) {
    body = cleanEmailBody(text);
  } else if (html) {
    body = cleanEmailBody(html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim());
  }

  if (!body || body.length < 2) {
    console.warn("Email inbound sem conteúdo útil");
    return new Response("OK");
  }

  // Criar ticket_message
  const msgResult = await db
    .prepare("INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, 'client', ?)")
    .bind(ticketId, body)
    .run();
  const newMessageId = Number(msgResult.meta.last_row_id);

  // Reabrir ticket se estava fechado
  await db
    .prepare("UPDATE tickets SET status = 'open' WHERE id = ? AND status = 'closed'")
    .bind(ticketId)
    .run();

  // Processar anexos
  for (const att of attachments) {
    if (!att.content || !att.filename) continue;
    try {
      const bytes  = Uint8Array.from(atob(att.content), (c) => c.charCodeAt(0));
      const r2Key  = `tickets/${ticketId}/msg-${newMessageId}/${Date.now()}-${att.filename}`;
      await env.UPLOADS.put(r2Key, bytes, {
        httpMetadata: { contentType: att.content_type },
      });
      await db
        .prepare(
          `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, r2_key)
           VALUES ('ticket_message', ?, ?, ?, ?, ?)`
        )
        .bind(newMessageId, att.filename, att.content_type, bytes.byteLength, r2Key)
        .run();
    } catch (e) {
      console.error("Erro ao guardar anexo:", att.filename, e);
    }
  }

  // Notificar admin
  if (env.RESEND_API_KEY && env.ADMIN_EMAIL && env.FROM_EMAIL) {
    const url = `${env.BASE_URL}/admin/tickets/${ticketId}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    env.FROM_EMAIL,
        to:      env.ADMIN_EMAIL,
        subject: `[Ticket #${ticketId}] Nova resposta de ${ticket.client_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
            <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:18px;">Resposta por Email — Ticket #${ticketId}</h1>
            </div>
            <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;color:#6b7280;">
                De: <strong>${ticket.client_name}</strong> &lt;${ticket.client_email}&gt;
              </p>
              <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${body}</p>
              </div>
              <a href="${url}"
                 style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Ver no Painel Admin
              </a>
            </div>
          </div>`,
      }),
    }).catch(console.error);
  }

  return new Response("OK");
}
