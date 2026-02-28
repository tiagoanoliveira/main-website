import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

// ── Tipos do handler de email ────────────────────────────────────────────────
// Estende o Env base com os secrets que não estão no wrangler.jsonc
interface EmailEnv extends Env {
  ADMIN_EMAIL:          string;
  FROM_EMAIL:           string;
  RESEND_API_KEY:       string;
  INBOUND_EMAIL_DOMAIN: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lê o email raw UMA vez e devolve a string.
 * message.raw é um ReadableStream — só pode ser lido uma vez.
 */
async function readRaw(message: ForwardableEmailMessage): Promise<string> {
  return new Response(message.raw).text();
}

/** Extrai o corpo text/plain (ou text/html sem tags) e limpa citações */
function extractBodyFromRaw(raw: string): string {
  const plainMatch = raw.match(
    /Content-Type: text\/plain[^\n]*\n(?:.*\n)*?\n([\s\S]*?)(?=--[\w-]+|$)/i
  );
  if (plainMatch) return cleanEmailBody(plainMatch[1].trim());

  const htmlMatch = raw.match(
    /Content-Type: text\/html[^\n]*\n(?:.*\n)*?\n([\s\S]*?)(?=--[\w-]+|$)/i
  );
  if (htmlMatch) return cleanEmailBody(htmlMatch[1].replace(/<[^>]+>/g, " ").trim());

  return "";
}

/** Remove citações e assinaturas comuns, guarda apenas a nova mensagem */
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

/** Processa anexos MIME a partir do raw, faz upload para R2 e devolve metadados */
async function processAttachments(
  raw: string,
  bucket: R2Bucket,
  ticketId: number,
  messageId: number
): Promise<Array<{ fileName: string; fileType: string; fileSize: number; r2Key: string }>> {
  const results: Array<{ fileName: string; fileType: string; fileSize: number; r2Key: string }> = [];
  try {
    const boundaryMatch = raw.match(/boundary=["']?([^"'\s;\r\n]+)/i);
    if (!boundaryMatch) return results;

    const boundary = boundaryMatch[1];
    const parts = raw.split(
      new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g")
    );

    for (const part of parts) {
      if (!part.includes("Content-Disposition: attachment") && !part.includes("filename")) continue;
      const fileNameMatch    = part.match(/filename=["']?([^"'\r\n;]+)/i);
      const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n;]+)/i);
      if (!fileNameMatch) continue;

      const fileName = fileNameMatch[1].trim();
      const fileType = contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream";
      const bodyStart = part.indexOf("\r\n\r\n") !== -1
        ? part.indexOf("\r\n\r\n") + 4
        : part.indexOf("\n\n") + 2;
      const b64 = part.slice(bodyStart).replace(/[\r\n]/g, "").trim();
      if (!b64) continue;

      try {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const r2Key = `tickets/${ticketId}/msg-${messageId}/${Date.now()}-${fileName}`;
        await bucket.put(r2Key, bytes, { httpMetadata: { contentType: fileType } });
        results.push({ fileName, fileType, fileSize: bytes.byteLength, r2Key });
      } catch (e) {
        console.error("Erro ao processar anexo:", fileName, e);
      }
    }
  } catch (e) {
    console.error("Erro ao processar anexos do email:", e);
  }
  return results;
}

/** Notifica o admin via Resend quando chega uma resposta por email */
async function notifyAdminEmailReply(
  env: EmailEnv,
  ticketId: number,
  clientName: string,
  clientEmail: string,
  body: string
) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL || !env.FROM_EMAIL) return;
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
      subject: `[Ticket #${ticketId}] Nova resposta por email de ${clientName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
          <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:18px;">Resposta por Email — Ticket #${ticketId}</h1>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="margin:0 0 8px;color:#6b7280;">De: <strong>${clientName}</strong> &lt;${clientEmail}&gt;</p>
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${body}</p>
            </div>
            <a href="${url}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver no Painel Admin</a>
          </div>
        </div>`,
    }),
  }).catch(console.error);
}

// ── Worker ───────────────────────────────────────────────────────────────────

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  // ── HTTP → aplicação React Router ──
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return requestHandler(request, { cloudflare: { env, ctx } });
  },

  // ── Email inbound (Cloudflare Email Routing → este worker) ──
  //
  // Regras no Cloudflare Dashboard → Email → Email Routing:
  //   1. Endereço personalizado: geral@tiagoanoliveira.pt → Reencaminhar para → <o teu email pessoal>
  //   2. Catch-all → Worker "main-website"
  //
  // O catch-all apanha ticket-42@tiagoanoliveira.pt e tudo o resto.
  // Emails sem ticket ID são reencaminhados para ADMIN_EMAIL pelo worker.
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext) {
    const eenv = env as unknown as EmailEnv;
    const to   = message.to;

    // Ler o email raw UMA vez (ReadableStream só pode ser lido uma vez)
    const raw = await readRaw(message);

    // Extrair ticket ID do endereço de destino: ticket-42@tiagoanoliveira.pt
    const ticketMatch = to.match(/^ticket-(\d+)@/i);
    if (!ticketMatch) {
      // Não é um email de ticket → reencaminhar para admin
      if (eenv.ADMIN_EMAIL) {
        try { await message.forward(eenv.ADMIN_EMAIL); } catch (e) {
          console.error("Erro ao reencaminhar email não-ticket:", e);
        }
      }
      return;
    }

    const ticketId = Number(ticketMatch[1]);

    // Verificar se o ticket existe
    const ticket = await eenv.DB
      .prepare("SELECT id, client_name, client_email FROM tickets WHERE id = ?")
      .bind(ticketId)
      .first<{ id: number; client_name: string; client_email: string }>();

    if (!ticket) {
      try { await message.forward(eenv.ADMIN_EMAIL); } catch {}
      return;
    }

    // Validar que o remetente é o cliente do ticket
    if (ticket.client_email.toLowerCase() !== message.from.toLowerCase()) {
      try { await message.forward(eenv.ADMIN_EMAIL); } catch {}
      return;
    }

    // Extrair corpo
    const body = extractBodyFromRaw(raw);
    if (!body || body.length < 2) return;

    // Criar ticket_message
    const msgResult = await eenv.DB
      .prepare("INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, 'client', ?)")
      .bind(ticketId, body)
      .run();
    const newMessageId = Number(msgResult.meta.last_row_id);

    // Reabrir ticket se estava fechado
    await eenv.DB
      .prepare("UPDATE tickets SET status = 'open' WHERE id = ? AND status = 'closed'")
      .bind(ticketId)
      .run();

    // Processar anexos (usa o raw já lido)
    const attachments = await processAttachments(raw, eenv.UPLOADS, ticketId, newMessageId);
    for (const att of attachments) {
      await eenv.DB
        .prepare(
          `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, r2_key)
           VALUES ('ticket_message', ?, ?, ?, ?, ?)`
        )
        .bind(newMessageId, att.fileName, att.fileType, att.fileSize, att.r2Key)
        .run();
    }

    // Notificar admin
    await notifyAdminEmailReply(eenv, ticketId, ticket.client_name, message.from, body);
  },
} satisfies ExportedHandler<Env>;
