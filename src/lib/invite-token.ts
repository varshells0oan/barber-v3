// Utilitários para gerar/hashear tokens de convite no cliente.
// O token em texto puro só vive na URL do link de convite; o banco guarda apenas o hash.

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateInviteToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export function buildInviteUrl(token: string): string {
  return `${window.location.origin}/aceitar-convite?token=${token}`;
}
