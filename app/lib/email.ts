import { Resend } from "resend";

const style = `font-family:'Inter',-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111827;`;

// ── Confirmação ao cliente quando submete ticket ──────────────

export async function sendTicketConfirmation(params: {
    apiKey: string; from: string;
    to: string; clientName: string;
    ticketId: number; category: string;
    description: string; publicToken: string; baseUrl: string;
}) {
    const resend = new Resend(params.apiKey);
    const url = `${params.baseUrl}/ticket/${params.publicToken}`;
    return resend.emails.send({
        from: params.from,
        to:   params.to,
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
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Podes também responder diretamente a este email para adicionar informações ao teu pedido.
          </p>
        </div>
      </div>`,
    });
}

// ── Resposta do admin ao cliente ──────────────────────────────

export async function sendAdminReply(params: {
    apiKey: string; from: string; replyTo: string;
    to: string; clientName: string;
    ticketId: number; category: string;
    message: string; publicToken: string; baseUrl: string;
}) {
    const resend = new Resend(params.apiKey);
    const url = `${params.baseUrl}/ticket/${params.publicToken}`;
    return resend.emails.send({
        from:     params.from,
        to:       params.to,
        replyTo: params.from,
        subject:  `[Suporte #${params.ticketId}] Nova resposta — ${params.category}`,
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
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Podes responder diretamente a este email ou usar o botão acima.
          </p>
        </div>
      </div>`,
    });
}

// ── Notificação ao admin quando cliente responde ──────────────

export async function sendAdminNotification(params: {
    apiKey: string; from: string; adminEmail: string;
    clientName: string; ticketId: number;
    message: string; baseUrl: string;
}) {
    const resend = new Resend(params.apiKey);
    const url = `${params.baseUrl}/admin/tickets/${params.ticketId}`;
    return resend.emails.send({
        from:    params.from,
        to:      params.adminEmail,
        subject: `[Ticket #${params.ticketId}] Nova resposta de ${params.clientName}`,
        html: `
      <div style="${style}">
        <div style="background:#111827;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">Resposta no Ticket #${params.ticketId}</h1>
        </div>
        <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          <p style="margin:0 0 12px;color:#6b7280;"><strong>${params.clientName}</strong> respondeu:</p>
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

export async function sendPasswordReset(params: {
    apiKey: string; from: string;
    to: string; clientName: string;
    resetToken: string; baseUrl: string;
}) {
    const resend = new Resend(params.apiKey);
    const url = `${params.baseUrl}/portal/reset-password?token=${params.resetToken}`;
    return resend.emails.send({
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
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Se não solicitaste isto, ignora este email.
          </p>
        </div>
      </div>`,
    });
}

export async function sendWelcome(params: {
    apiKey: string; from: string;
    to: string; clientName: string;
    password: string; baseUrl: string;
}) {
    const resend = new Resend(params.apiKey);
    return resend.emails.send({
        from: params.from, to: params.to,
        subject: "Bem-vindo ao Portal Cliente",
        html: `
      <div style="${style}">
        <div style="background:#2563eb;padding:32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">Bem-vindo, ${params.clientName}!</h1>
        </div>
        <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
          <p style="margin:0 0 16px;">Criámos o teu acesso ao portal de cliente. Aqui ficam as tuas credenciais:</p>
          <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;"><strong>Email:</strong> ${params.to}</p>
            <p style="margin:0;font-size:13px;"><strong>Password:</strong> ${params.password}</p>
          </div>
          <a href="${params.baseUrl}/portal"
             style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Aceder ao Portal
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Recomendamos que alteres a password após o primeiro acesso.
          </p>
        </div>
      </div>`,
    });
}
