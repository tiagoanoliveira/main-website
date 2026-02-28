/**
 * app/routes/api.webhooks.email-inbound.ts
 *
 * Recebe o webhook do Resend Inbound quando um cliente responde
 * por email a um ticket.
 *
 * Configuração necessária:
 *   1. No Resend Dashboard → Receiving → adicionar domínio reply.tiagoanoliveira.pt
 *      e adicionar o MX record fornecido ao subdomínio no Cloudflare DNS.
 *   2. No Resend Dashboard → Webhooks → criar webhook:
 *        URL: https://tiagoanoliveira.pt/api/webhooks/email-inbound
 *        Evento: email.received
 *   3. Guardar o Signing Secret do webhook como secret:
 *        wrangler secret put RESEND_WEBHOOK_SECRET
 *
 * Fluxo:
 *   - Cliente responde ao email (replyTo: ticket-{id}@reply.tiagoanoliveira.pt)
 *   - Resend recebe o email, chama este webhook com payload JSON
 *   - Extrai ticket ID do endereço "to"
 *   - Valida remetente, cria ticket_message, processa anexos, notifica admin
 */

import type { ActionFunctionArgs } from "react-router";

interface ResendAttachment {
    filename: string;
    content_type: string;
    size?: number;
    // Resend pode enviar conteúdo inline (base64) ou só metadata + id
    content?: string;
    id?: string;
}

interface ResendInboundPayload {
    type: string;
    data: {
        from: string;
        to: string[];
        subject?: string;
        text?: string;
        html?: string;
        attachments?: ResendAttachment[];
    };
}

// ── Verificar assinatura Svix do webhook ───────────────────────────

async function verifyResendWebhook(
    rawBody: string,
    headers: Headers,
    secret: string
): Promise<boolean> {
    const msgId        = headers.get("svix-id");
    const msgTimestamp = headers.get("svix-timestamp");
    const msgSignature = headers.get("svix-signature");
    if (!msgId || !msgTimestamp || !msgSignature) return false;

    // Rejeitar timestamps com mais de 5 minutos
    const ts = Number(msgTimestamp);
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

    // Derivar chave: remover prefixo "whsec_" e descodificar base64
    const keyBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBytes  = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
        "raw", keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false, ["sign"]
    );

    const message  = `${msgId}.${msgTimestamp}.${rawBody}`;
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

    // O header pode ter várias assinaturas separadas por espaço (ex: "v1,xxx v1,yyy")
    const signatures = msgSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
    return signatures.some((s) => s === computed);
}

// ── Extrair ticket ID do endereço de destino ─────────────────────────
// ex: "ticket-42@reply.tiagoanoliveira.pt" → 42

function extractTicketId(toAddresses: string[]): number | null {
    for (const addr of toAddresses) {
        const m = addr.match(/ticket[-+](\d+)@/i);
        if (m) return Number(m[1]);
    }
    return null;
}

// ── Limpar corpo do email (remover citações) ─────────────────────────

function cleanEmailBody(body: string): string {
    const lines   = body.split("\n");
    const cleaned: string[] = [];
    for (const line of lines) {
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

// ── Action (POST) ───────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context.cloudflare;

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const rawBody = await request.text();

    // Verificar assinatura (ignoração silenciosa em dev se segredo não estiver definido)
    if (env.RESEND_WEBHOOK_SECRET) {
        const valid = await verifyResendWebhook(rawBody, request.headers, env.RESEND_WEBHOOK_SECRET);
        if (!valid) {
            console.error("Webhook Resend: assinatura inválida");
            return new Response("Unauthorized", { status: 401 });
        }
    }

    let payload: ResendInboundPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return new Response("Bad Request", { status: 400 });
    }

    // Apenas processar eventos de email recebido
    if (payload.type !== "email.received") {
        return new Response("OK", { status: 200 });
    }

    const { from, to, text, html, attachments } = payload.data;
    const ticketId = extractTicketId(to ?? []);

    if (!ticketId) {
        console.log("Webhook Resend: email sem ticket ID nos endereços 'to'", to);
        return new Response("OK", { status: 200 });
    }

    // Verificar se o ticket existe
    const ticket = await env.DB
        .prepare("SELECT id, client_name, client_email FROM tickets WHERE id = ?")
        .bind(ticketId)
        .first<{ id: number; client_name: string; client_email: string }>();

    if (!ticket) {
        console.log("Webhook Resend: ticket não encontrado", ticketId);
        return new Response("OK", { status: 200 });
    }

    // Validar que o remetente é o cliente do ticket
    if (ticket.client_email.toLowerCase() !== from.toLowerCase()) {
        console.log("Webhook Resend: remetente não corresponde ao cliente do ticket", from, ticket.client_email);
        return new Response("OK", { status: 200 });
    }

    // Extrair e limpar corpo
    const rawText = text ?? (html ? html.replace(/<[^>]+>/g, " ") : "");
    const body    = cleanEmailBody(rawText.trim());
    if (!body || body.length < 2) {
        return new Response("OK", { status: 200 });
    }

    // Criar ticket_message
    const msgResult = await env.DB
        .prepare("INSERT INTO ticket_messages (ticket_id, sender, message) VALUES (?, 'client', ?)")
        .bind(ticketId, body)
        .run();
    const newMessageId = Number(msgResult.meta.last_row_id);

    // Reabrir ticket se estava fechado
    await env.DB
        .prepare("UPDATE tickets SET status = 'open' WHERE id = ? AND status = 'closed'")
        .bind(ticketId)
        .run();

    // Processar anexos
    if (attachments?.length) {
        for (const att of attachments) {
            try {
                let bytes: ArrayBuffer | null = null;

                if (att.content) {
                    // Conteúdo inline base64
                    const bin = atob(att.content);
                    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
                } else if (att.id && env.RESEND_API_KEY) {
                    // Ir buscar via Resend Attachments API
                    const res = await fetch(`https://api.resend.com/attachments/${att.id}`, {
                        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
                    });
                    if (res.ok) bytes = await res.arrayBuffer();
                }

                if (!bytes) continue;

                const r2Key = `tickets/${ticketId}/msg-${newMessageId}/${Date.now()}-${att.filename}`;
                await env.UPLOADS.put(r2Key, bytes, {
                    httpMetadata: { contentType: att.content_type },
                });
                await env.DB
                    .prepare(
                        `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, r2_key)
                         VALUES ('ticket_message', ?, ?, ?, ?, ?)`
                    )
                    .bind(newMessageId, att.filename, att.content_type, att.size ?? bytes.byteLength, r2Key)
                    .run();
            } catch (e) {
                console.error("Erro ao processar anexo:", att.filename, e);
            }
        }
    }

    // Notificar admin
    if (env.RESEND_API_KEY && env.ADMIN_EMAIL && env.FROM_EMAIL) {
        const adminUrl = `${env.BASE_URL}/admin/tickets/${ticketId}`;
        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from:    env.FROM_EMAIL,
                to:      env.ADMIN_EMAIL,
                subject: `[Ticket #${ticketId}] Nova resposta por email de ${ticket.client_name}`,
                html: `
                    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
                      <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
                        <h1 style="color:white;margin:0;font-size:18px;">Resposta por Email — Ticket #${ticketId}</h1>
                      </div>
                      <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                        <p style="margin:0 0 8px;color:#6b7280;">De: <strong>${ticket.client_name}</strong> &lt;${from}&gt;</p>
                        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                          <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${body}</p>
                        </div>
                        <a href="${adminUrl}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver no Painel Admin</a>
                      </div>
                    </div>`,
            }),
        }).catch((e) => console.error("Erro ao notificar admin:", e));
    }

    return new Response("OK", { status: 200 });
}
