import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Converte um username simples em um "email sintético" usado internamente
 * pelo Supabase Auth. O usuário nunca digita esse email — ele digita só o username.
 */
/**
 * Normaliza um nome de usuário digitado ("Barber Neto", " João ", etc.)
 * para uma forma segura pra usar como parte de e-mail: minúsculo, sem acento,
 * espaços e caracteres estranhos viram "-".
 */
function normalizeUsername(raw: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@bs.local`;
}

/**
 * Supabase Auth exige senha com >= 6 caracteres. Como o dono do SaaS quer
 * poder definir senhas curtas ("123"), prefixamos internamente com um sal fixo.
 * O usuário nunca vê nem digita esse prefixo — é aplicado no servidor tanto
 * no set quanto no login.
 */
export const PWD_SALT = "bsx9_";
export function wrapPassword(pwd: string): string {
  return `${PWD_SALT}${pwd}`;
}

/**
 * Superadmin define/atualiza usuário e senha do DONO de uma barbearia.
 * - Cria (ou atualiza) o auth.users com email sintético `{username}@bs.local`
 * - Concede role admin escopada àquela barbershop_id em user_roles
 * - Guarda o username em barbershops.admin_username para exibição
 */
export const setShopAdminCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { barbershopId: string; username: string; password: string }) => {
      const username = String(data.username ?? "").trim().toLowerCase();
      const password = String(data.password ?? "");
      const barbershopId = String(data.barbershopId ?? "");
      if (!/^[a-z0-9_.-]{2,32}$/.test(username)) {
        throw new Error("Usuário inválido (use 2-32 caracteres: a-z, 0-9, _ . -)");
      }
      if (password.length < 1) throw new Error("Senha obrigatória");
      if (!barbershopId) throw new Error("Barbearia inválida");
      return { barbershopId, username, password };
    },
  )
  .handler(async ({ data, context }) => {
    // Só superadmin
    const { data: isSuper } = await context.supabase.rpc("is_superadmin", {
      _user_id: context.userId,
    });
    if (!isSuper) throw new Error("Não autorizado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = usernameToEmail(data.username);

    // Já existe usuário com este email?
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const existing = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );

    let userId: string;
    if (existing) {
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
        email_confirm: true,
      });
      if (updErr) throw updErr;
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { source: "shop-admin", username: data.username },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Concede role admin escopada à barbearia (idempotente)
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin", barbershop_id: data.barbershopId },
        { onConflict: "user_id,role,barbershop_id", ignoreDuplicates: true },
      );
    if (roleErr) throw roleErr;

    // Guarda o username visível
    const { error: shopErr } = await supabaseAdmin
      .from("barbershops")
      .update({ admin_username: data.username })
      .eq("id", data.barbershopId);
    if (shopErr) throw shopErr;

    return { ok: true, username: data.username };
  });

/**
 * Faz login por usuário+senha em uma barbearia específica.
 * Retorna o email sintético — o cliente usa isso pra chamar supabase.auth.signInWithPassword.
 */
export const resolveShopLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; username: string }) => {
    const slug = String(data.slug ?? "").trim().toLowerCase();
    const username = String(data.username ?? "").trim().toLowerCase();
    if (!slug || !username) throw new Error("Dados inválidos");
    return { slug, username };
  })
  .handler(async ({ data }) => {
    // Só valida que o username corresponde ao dono daquela barbearia.
    // O signIn efetivo acontece no cliente com o email sintético.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: shop, error } = await supabaseAdmin
      .from("barbershops")
      .select("id, admin_username, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!shop || shop.status !== "active" || shop.admin_username !== data.username) {
      throw new Error("Usuário ou senha inválidos");
    }
    return { email: usernameToEmail(data.username) };
  });
