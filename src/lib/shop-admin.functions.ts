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
      const usernameNorm = normalizeUsername(data.username);
      const password = String(data.password ?? "");
      const barbershopId = String(data.barbershopId ?? "");
      if (usernameNorm.length < 2 || usernameNorm.length > 40) {
        throw new Error("Usuário deve ter entre 2 e 40 caracteres");
      }
      if (password.length < 6) {
        throw new Error("Senha deve ter no mínimo 6 caracteres");
      }
      if (!barbershopId) throw new Error("Barbearia inválida");
      return { barbershopId, username: usernameNorm, password };
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
        password: wrapPassword(data.password),
        email_confirm: true,
      });
      if (updErr) throw updErr;
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: wrapPassword(data.password),
        email_confirm: true,
        user_metadata: { source: "shop-admin", username: data.username },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Concede role admin escopada à barbearia (idempotente — sem unique constraint, checamos antes)
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("barbershop_id", data.barbershopId)
      .maybeSingle();
    if (!existingRole) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "admin", barbershop_id: data.barbershopId });
      if (roleErr) throw roleErr;
    }

    // Guarda o username visível
    const { error: shopErr } = await supabaseAdmin
      .from("barbershops")
      .update({ admin_username: data.username })
      .eq("id", data.barbershopId);
    if (shopErr) throw shopErr;

    return { ok: true, username: data.username };
  });

/**
 * Extrai o IP do request (server-only). Cai em "unknown" se nenhum header estiver disponível.
 */
async function getClientIp(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const h = req?.headers;
  if (!h) return "unknown";
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? "unknown";
}

/**
 * Faz login por usuário+senha em uma barbearia específica.
 * Retorna o email sintético — o cliente usa isso pra chamar supabase.auth.signInWithPassword.
 * Antes de responder, verifica rate limit: 5 falhas em 15 min pra combinação IP+slug bloqueia.
 */
export const resolveShopLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; username: string }) => {
    const slug = String(data.slug ?? "").trim().toLowerCase();
    const username = normalizeUsername(data.username);
    if (!slug || !username) throw new Error("Dados inválidos");
    return { slug, username };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = await getClientIp();

    // Rate limit ANTES de qualquer validação
    const { data: rl } = await supabaseAdmin.rpc("check_login_rate_limit", {
      _ip: ip,
      _slug: data.slug,
    });
    const rlRow = Array.isArray(rl) ? rl[0] : rl;
    if (rlRow && rlRow.allowed === false) {
      throw new Error(
        `Muitas tentativas. Tente novamente em ${rlRow.retry_after_seconds}s.`,
      );
    }

    const { data: shop, error } = await supabaseAdmin
      .from("barbershops")
      .select("id, admin_username, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!shop || shop.status !== "active" || shop.admin_username !== data.username) {
      // registra a falha do próprio "usuário inexistente"
      await supabaseAdmin.rpc("record_login_attempt", {
        _ip: ip,
        _slug: data.slug,
        _success: false,
      });
      throw new Error("Usuário ou senha inválidos");
    }
    return { email: usernameToEmail(data.username) };
  });

async function getUserAgent(): Promise<string | null> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  return req?.headers?.get("user-agent") ?? null;
}

/**
 * Registra o resultado final do login (chamado pelo cliente após signInWithPassword).
 * Sucesso ou falha, alimenta o rate limit e o log de auditoria.
 */
export const recordShopLoginResult = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; success: boolean; username?: string }) => ({
    slug: String(data.slug ?? "").trim().toLowerCase(),
    success: Boolean(data.success),
    username: data.username ? normalizeUsername(data.username) : null,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = await getClientIp();
    const ua = await getUserAgent();

    await supabaseAdmin.rpc("record_login_attempt", {
      _ip: ip,
      _slug: data.slug,
      _success: data.success,
    });

    // resolve barbershop_id pra correlacionar no audit
    const { data: shop } = await supabaseAdmin
      .from("barbershops")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    await supabaseAdmin.rpc("log_audit_event" as any, {
      _barbershop_id: shop?.id ?? null,
      _actor_kind: "admin",
      _actor_id: null,
      _actor_label: data.username,
      _event: data.success ? "login_success" : "login_failed",
      _ip: ip,
      _user_agent: ua,
      _metadata: { slug: data.slug },
    } as any);

    return { ok: true };
  });
