/**
 * workers/email-inbound.ts
 *
 * Cloudflare Email Worker — recebe emails enviados para support@tiagoanoliveira.pt
 * e trata-os como respostas a tickets existentes.
 *
 * Fluxo:
 *  1. Extrai o assunto do email recebido.
 *  2. Procura "#<id>" no assunto para identificar o ticket.
 *  3. Se encontrar, cria uma nova ticket_message (sender = 'client').
 *  4. Faz upload de eventuais anexos para R2 e regista-os em attachments.
 *  5. Notifica o admin por email.
 *  6. Se não encontrar ticket, reencaminha para o admin (fallback).
 *
 * Deploy:
 *   wrangler deploy workers/email-inbound.ts --name email-inbound \
 *     --compatibility-date 2025-04-04 --compatibility-flags nodejs_compat
 *
 * No Cloudflare Dashboard → Email → Email Routing:
 *   - Adicionar regra: support@tiagoanoliveira.pt → Worker "email-inbound"
 */

import { EmailMessage } from "cloudflare:email";

declare global {
    interface Env {
        DB: D1Database;
        UPLOADS: R2Bucket;
        ADMIN_EMAIL: string;
        FROM_EMAIL: string;
        BASE_URL: string;
        RESEND_API_KEY: string;
    }
}

// ── Helpers ────────────────────────────────────────────────────

/** Extrai o ID do ticket do assunto, ex: "Re: [Suporte #42] ..." → 42 */
function extractTicketId(subject: string): number | null {
    const m = subject.match(/#(\d+)/);
    return m ? Number(m[1]) : null;
}

/** Lê o corpo texto do email (text/plain preferido, fallback text/html sem tags) */
async function extractTextBody(message: ForwardableEmailMessage): Promise<string> {
    try {
        const raw = await new Response(message.raw).text();

        // Procura secção text/plain
        const plainMatch = raw.match(
            /Content-Type: text\/plain[^\n]*\n(?:.*\n)*?\n([\s\S]*?)(?=--[\w-]+|$)/i
        );
        if (plainMatch) {
            return cleanEmailBody(plainMatch[1].trim());
        }

        // Fallback: text/html → strip tags
        const htmlMatch = raw.match(
            /Content-Type: text\/html[^\n]*\n(?:.*\n)*?\n([\s\S]*?)(?=--[\w-]+|$)/i
        );
        if (htmlMatch) {
            return cleanEmailBody(htmlMatch[1].replace(/<[^>]+>/g, " ").trim());
        }

        return "(sem conteúdo de texto)";
    } catch {
        return "(erro ao ler corpo do email)";
    }
}

/**
 * Remove quoted reply (linhas que começam com >) e assinaturas
 * comuns para guardar apenas a nova mensagem.
 */
function cleanEmailBody(body: string): string {
    const lines = body.split("\n");
    const cleaned: string[] = [];
    for (const line of lines) {
        const trimmed = line.trimStart();
        if (
            trimmed.startsWith(">") ||
            /^On .+ wrote:$/i.test(trimmed) ||
            trimmed.startsWith("--- ") ||
            trimmed.startsWith("________")
        ) break;
        cleaned.push(line);
    }
    return cleaned.join("\n").trim();
}

/**
 * Extrai anexos do email raw e faz upload para R2.
 * Retorna lista de { fileName, fileType, fileSize, r2Key }.
 */
async function processAttachments(
    message: ForwardableEmailMessage,
    bucket: R2Bucket,
    ticketId: number,
    messageId: number
): Promise<Array<{ fileName: string; fileType: string; fileSize: number; r2Key: string }>> {
    const results: Array<{ fileName: string; fileType: string; fileSize: number; r2Key: string }> = [];
    try {
        const raw = await new Response(message.raw).text();

        const boundaryMatch = raw.match(/boundary=["']?([^"'\s;\r\n]+)/i);
        if (!boundaryMatch) return results;

        const boundary = boundaryMatch[1];
        const parts = raw.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));

        for (const part of parts) {
            if (!part.includes("Content-Disposition: attachment") && !part.includes("filename")) continue;

            const fileNameMatch = part.match(/filename=["']?([^"'\r\n;]+)/i);
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

/** Envia notificação ao admin via Resend (fetch direto — sem SDK npm) */
async function notifyAdmin(env: Env, ticketId: number, clientName: string, clientEmail: string, message: string) {
    if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return;
    const url = `${env.BASE_URL}/admin/tickets/${ticketId}`;
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
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
                            <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${message}</p>
                        </div>
                        <a href="${url}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver no Painel Admin</a>
                    </div>
                </div>`,
        }),
    }).catch(console.error);
}

// ── Handler principal ──────────────────────────────────────────

export default {
    async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
        const subject  = message.headers.get("subject") ?? "";
        const fromAddr = message.from;
        const ticketId = extractTicketId(subject);

        // Sem ID de ticket → reencaminhar para admin
        if (!ticketId) {
            try { await message.forward(env.ADMIN_EMAIL); } catch (e) {
                console.error("Erro ao reencaminhar email sem ticket ID:", e);
            }
            return;
        }

        // Verificar se o ticket existe
        const ticket = await env.DB
            .prepare(
                `SELECT t.id, t.client_name, t.client_email, t.public_token, t.category
                 FROM tickets t
                 WHERE t.id = ?`
            )
            .bind(ticketId)
            .first<{
                id: number;
                client_name: string;
                client_email: string;
                public_token: string;
                category: string;
            }>();

        if (!ticket) {
            try { await message.forward(env.ADMIN_EMAIL); } catch {}
            return;
        }

        // Validar que o remetente é o cliente do ticket
        if (ticket.client_email.toLowerCase() !== fromAddr.toLowerCase()) {
            try { await message.forward(env.ADMIN_EMAIL); } catch {}
            return;
        }

        // Extrair corpo
        const body = await extractTextBody(message);
        if (!body || body.length < 2) return;

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
        const attachments = await processAttachments(message, env.UPLOADS, ticketId, newMessageId);
        for (const att of attachments) {
            await env.DB
                .prepare(
                    `INSERT INTO attachments (entity_type, entity_id, file_name, file_type, file_size, r2_key)
                     VALUES ('ticket_message', ?, ?, ?, ?, ?)`
                )
                .bind(newMessageId, att.fileName, att.fileType, att.fileSize, att.r2Key)
                .run();
        }

        // Notificar admin
        await notifyAdmin(env, ticketId, ticket.client_name, fromAddr, body);
    },
} satisfies ExportedHandler<Env>;
