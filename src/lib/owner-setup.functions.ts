import { createServerFn } from "@tanstack/react-start";

/**
 * Primeiro acesso do dono da plataforma: troca um código de uso único
 * (hash guardado no app_metadata da conta superadmin) por uma senha própria.
 */
export const completeOwnerSetup = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string; password: string }) => {
    const email = String(d?.email ?? "").trim().toLowerCase();
    const code = String(d?.code ?? "").trim().toUpperCase();
    const password = String(d?.password ?? "");
    if (!email || code.length < 6 || code.length > 32) throw new Error("Dados inválidos.");
    if (password.length < 8 || password.length > 72) throw new Error("A senha precisa ter de 8 a 72 caracteres.");
    return { email, code, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fail = () => { throw new Error("Código inválido ou expirado."); };

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "superadmin");
    if (!roles || roles.length !== 1) fail();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(roles![0].user_id);
    const user = u?.user;
    if (!user || (user.email ?? "").toLowerCase() !== data.email) fail();

    const meta = (user!.app_metadata ?? {}) as Record<string, unknown>;
    const hash = meta.owner_setup_hash as string | undefined;
    const exp = Number(meta.owner_setup_expires ?? 0);
    if (!hash || !meta.owner_setup_pending || Date.now() > exp) fail();

    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.code))))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    let diff = digest.length ^ hash!.length;
    for (let i = 0; i < Math.min(digest.length, hash!.length); i++) diff |= digest.charCodeAt(i) ^ hash!.charCodeAt(i);
    if (diff !== 0) fail();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user!.id, {
      password: data.password,
      app_metadata: { ...meta, owner_setup_hash: null, owner_setup_expires: null, owner_setup_pending: false },
    });
    if (error) throw new Error("Não foi possível salvar a senha. Tente outra.");
    return { ok: true };
  });
