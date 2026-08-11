/**
 * Gera e valida um token que identifica o owner numa URL pública.
 * Usa HMAC-SHA256 sobre o publicToken do ticket para evitar spoofing.
 *
 * Uso no link de email: /ticket/{publicToken}?ownerSig={sig}
 * Na action: await verifyOwnerSig(publicToken, ownerSig) → true/false
 */

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Gera a assinatura para incluir no link enviado ao owner. */
export async function generateOwnerSig(publicToken: string, secret: string): Promise<string> {
  return hmac(secret, `owner:${publicToken}`);
}

/** Verifica se a assinatura recebida é válida para este publicToken. */
export async function verifyOwnerSig(
  publicToken: string,
  sig: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!sig || !secret) return false;
  const expected = await hmac(secret, `owner:${publicToken}`);
  // Comparação em tempo constante
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}
