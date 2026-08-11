import { Resend } from "resend";
import { generateOwnerSig } from "~/lib/ownerToken";

const style = `font-family:'Inter',-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827;`;

// Helper — lida com o padrão {data, error} do Resend SDK v2
async function sendEmail(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0]
) {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`Resend: ${error.message} (name: ${(error as { name?: string }).name ?? "unknown"})`);
  }
  return data;
}

// ── Confirmação ao cliente quando submete ticket ────────────────────────
export async function sendTicketConfirmation(params: {
  apiKey: string;
  from: string;
  to: string;
  clientName: string;
  ticketId: number;
  category: string;
  description: string;
  publicToken: string;
  baseUrl: string;
}) {
  const resend = new Resend(params.apiKey);
  const url    = `${params.baseUrl}/ticket/${params.publicToken}`;
  return sendEmail(resend, {
    from:    params.from,
    to:      params.to,
    replyTo: params.from,
    subject: `[Suporte #${params.ticketId}] Pedido recebido — ${params.category}`,
    html: `
    <div style="${style}">
      <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Pedido de Suporte Recebido</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;">Olá <strong>${params.clientName}</strong>,</p>
        <p style="margin:0 0 24px;color:#6b7280;">Recebemos o teu pedido de suporte. Entraremos em contacto brevemente.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">TICKET #${params.ticketId} · ${params.category}</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">${params.description}</p>
        </div>
        <a href="${url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Acompanhar Ticket
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Para responder ou adicionar informações ao teu pedido, usa o botão acima.</p>
      </div>
    </div>`,
  });
}

// ── Resposta do admin ao cliente ────────────────────────────────────────────
export async function sendAdminReply(params: {
  apiKey: string;
  from: string;
  to: string;
  clientName: string;
  ticketId: number;
  category: string;
  message: string;
  publicToken: string;
  baseUrl: string;
}) {
  const resend = new Resend(params.apiKey);
  const url    = `${params.baseUrl}/ticket/${params.publicToken}`;
  return sendEmail(resend, {
    from:    params.from,
    to:      params.to,
    replyTo: params.from,
    subject: `[Suporte #${params.ticketId}] Nova resposta — ${params.category}`,
    html: `
    <div style="${style}">
      <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Nova Resposta ao Teu Ticket</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;">Olá <strong>${params.clientName}</strong>,</p>
        <p style="margin:0 0 20px;color:#6b7280;">Tens uma nova resposta ao ticket <strong>#${params.ticketId}</strong>:</p>
        <div style="background:white;border-left:3px solid #2563eb;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
          <p style="margin:0;line-height:1.7;">${params.message.replace(/\n/g, "<br>")}</p>
        </div>
        <a href="${url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver Ticket &amp; Responder
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Para responder, usa o botão acima — não respondas diretamente a este email.</p>
      </div>
    </div>`,
  });
}

// ── Notificação ao admin ──────────────────────────────────────────────────
export async function sendAdminNotification(params: {
  apiKey: string;
  from: string;
  adminEmail: string;
  clientName: string;
  ticketId: number;
  message: string;
  baseUrl: string;
  isNewTicket?: boolean;
  category?: string;
}) {
  const resend  = new Resend(params.apiKey);
  const url     = `${params.baseUrl}/admin/tickets/${params.ticketId}`;
  const isNew   = params.isNewTicket ?? false;
  const subject = isNew
    ? `[Novo Ticket #${params.ticketId}] ${params.category ?? ""} — ${params.clientName}`
    : `[Ticket #${params.ticketId}] Nova resposta de ${params.clientName}`;
  const heading = isNew
    ? `Novo Ticket #${params.ticketId} Aberto`
    : `Resposta no Ticket #${params.ticketId}`;
  const intro = isNew
    ? `<strong>${params.clientName}</strong> abriu um novo pedido${params.category ? ` — <strong>${params.category}</strong>` : ""}:`
    : `<strong>${params.clientName}</strong> respondeu via página de suporte:`;

  return sendEmail(resend, {
    from:    params.from,
    to:      params.adminEmail,
    subject,
    html: `
    <div style="${style}">
      <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:18px;">${heading}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 12px;color:#6b7280;">${intro}</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;line-height:1.7;">${params.message.replace(/\n/g, "<br>")}</p>
        </div>
        <a href="${url}" style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver no Painel Admin
        </a>
      </div>
    </div>`,
  });
}

// ── Notificação ao owner do site ──────────────────────────────────────────────────
export async function sendOwnerNotification(params: {
  apiKey: string;
  from: string;
  ownerEmail: string;
  ownerName: string | null;
  siteName: string;
  clientName: string;
  ticketId: number;
  message: string;
  publicToken: string;
  baseUrl: string;
  isNewTicket?: boolean;
  category?: string;
  secretKey?: string;
}) {
  const resend    = new Resend(params.apiKey);
  const portalUrl = `${params.baseUrl}/portal`;
  const isNew     = params.isNewTicket ?? false;
  const greeting  = params.ownerName ? `Olá <strong>${params.ownerName}</strong>,` : "Olá,";

  // Gerar link assinado para o owner responder como 'owner' e não como 'client'
  let ownerUrl = `${params.baseUrl}/ticket/${params.publicToken}`;
  if (params.secretKey) {
    const sig = await generateOwnerSig(params.publicToken, params.secretKey);
    ownerUrl += `?ownerSig=${encodeURIComponent(sig)}`;
  }

  const subject = isNew
    ? `[Novo Ticket #${params.ticketId}] ${params.category ?? ""} — ${params.siteName}`
    : `[Ticket #${params.ticketId}] Nova resposta de ${params.clientName} — ${params.siteName}`;

  const heading = isNew
    ? `Novo Pedido de Suporte em ${params.siteName}`
    : `Nova Resposta no Ticket #${params.ticketId}`;

  const intro = isNew
    ? `<strong>${params.clientName}</strong> submeteu um novo pedido de suporte no teu site <strong>${params.siteName}</strong>${params.category ? ` — <strong>${params.category}</strong>` : ""}:`
    : `<strong>${params.clientName}</strong> adicionou uma nova resposta ao ticket <strong>#${params.ticketId}</strong> no teu site <strong>${params.siteName}</strong>:`;

  return sendEmail(resend, {
    from: params.from,
    to:   params.ownerEmail,
    subject,
    html: `
    <div style="${style}">
      <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:18px;">${heading}</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${params.siteName}</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 12px;">${greeting}</p>
        <p style="margin:0 0 16px;color:#6b7280;">${intro}</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">TICKET #${params.ticketId}${params.category ? " · " + params.category : ""}</p>
          <p style="margin:0;line-height:1.7;color:#374151;">${params.message.replace(/\n/g, "<br>")}</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="${ownerUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Responder ao Ticket
          </a>
          <a href="${portalUrl}" style="display:inline-block;background:white;color:#0f172a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;border:1px solid #e5e7eb;">
            Portal Cliente
          </a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">Podes responder diretamente através do botão acima. A resposta será registada como resposta do site <strong>${params.siteName}</strong>.</p>
      </div>
    </div>`,
  });
}

// ── Password reset ──────────────────────────────────────────────────────────────────
export async function sendPasswordReset(params: {
  apiKey: string;
  from: string;
  to: string;
  clientName: string;
  resetToken: string;
  baseUrl: string;
}) {
  const resend = new Resend(params.apiKey);
  const url    = `${params.baseUrl}/portal/reset-password?token=${params.resetToken}`;
  return sendEmail(resend, {
    from: params.from, to: params.to,
    subject: "Redefinir a tua password — Portal Cliente",
    html: `
    <div style="${style}">
      <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Redefinir Password</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;">Olá <strong>${params.clientName}</strong>,</p>
        <p style="margin:0 0 24px;color:#6b7280;">Foi solicitada a redefinição da tua password. O link é válido por 2 horas.</p>
        <a href="${url}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Redefinir Password
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Se não solicitaste isto, ignora este email.</p>
      </div>
    </div>`,
  });
}

// ── Boas-vindas ao portal ───────────────────────────────────────────────────────────
export async function sendWelcome(params: {
  apiKey: string;
  from: string;
  to: string;
  clientName: string;
  password: string;
  baseUrl: string;
}) {
  const resend = new Resend(params.apiKey);
  return sendEmail(resend, {
    from: params.from, to: params.to,
    subject: "Bem-vindo ao Portal Cliente",
    html: `
    <div style="${style}">
      <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Bem-vindo, ${params.clientName}!</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 16px;">Criámos o teu acesso ao portal de cliente:</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;"><strong>Email:</strong> ${params.to}</p>
          <p style="margin:0;font-size:13px;"><strong>Password:</strong> ${params.password}</p>
        </div>
        <a href="${params.baseUrl}/portal" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Aceder ao Portal
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Recomendamos que alteres a password após o primeiro acesso.</p>
      </div>
    </div>`,
  });
}
