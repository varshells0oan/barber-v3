import { createServerFn } from "@tanstack/react-start";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "barbearia";
}
const digits = (s: string) => String(s ?? "").replace(/\D/g, "");

/** Cadastro público de barbearia. Fica em pending_approval até o dono aprovar. */
export const registerBarbershop = createServerFn({ method: "POST" })
  .inputValidator((d: { ownerName: string; shopName: string; phone: string; email: string; password: string }) => {
    const ownerName = String(d.ownerName ?? "").trim();
    const shopName = String(d.shopName ?? "").trim();
    const phone = digits(d.phone);
    const email = String(d.email ?? "").trim().toLowerCase();
    const password = String(d.password ?? "");
    if (ownerName.length < 2 || ownerName.length > 80) throw new Error("Informe o nome do responsável");
    if (shopName.length < 2 || shopName.length > 80) throw new Error("Informe o nome da barbearia");
    if (phone.length < 10 || phone.length > 13) throw new Error("Telefone inválido");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) throw new Error("E-mail inválido");
    if (password.length < 6 || password.length > 72) throw new Error("Senha deve ter no mínimo 6 caracteres");
    return { ownerName, shopName, phone, email, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dupPhone } = await supabaseAdmin.from("barbershops").select("id").eq("owner_phone", data.phone).maybeSingle();
    if (dupPhone) throw new Error("Já existe um cadastro com este telefone");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { source: "barber-signup", name: data.ownerName, phone: data.phone },
    });
    if (cErr) {
      if (/already/i.test(cErr.message)) throw new Error("Já existe uma conta com este e-mail");
      throw new Error("Não foi possível criar a conta");
    }
    const userId = created.user!.id;

    let slug = slugify(data.shopName);
    for (let i = 0; i < 20; i++) {
      const { data: s } = await supabaseAdmin.from("barbershops").select("id").eq("slug", slug).maybeSingle();
      if (!s) break;
      slug = `${slugify(data.shopName)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    }

    const { data: shop, error: sErr } = await supabaseAdmin.from("barbershops").insert({
      name: data.shopName, slug, status: "inactive", subscription_status: "pending_approval",
      owner_name: data.ownerName, owner_email: data.email, owner_phone: data.phone,
      owner_user_id: userId, phone: data.phone, whatsapp: data.phone,
    }).select("id").single();
    if (sErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível registrar a barbearia");
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin", barbershop_id: shop.id });
    await supabaseAdmin.from("shop_settings").insert({ barbershop_id: shop.id, name: data.shopName } as any);
    await supabaseAdmin.rpc("log_audit_event", {
      _barbershop_id: shop.id, _actor_kind: "owner", _actor_id: userId, _actor_label: data.email,
      _event: "barbershop_signup", _ip: "", _user_agent: "", _metadata: {},
    });
    return { ok: true, slug };
  });

/** Login por e-mail OU telefone. Para telefone, resolve o e-mail no servidor e devolve a sessão. */
export const loginByIdentifier = createServerFn({ method: "POST" })
  .inputValidator((d: { identifier: string; password: string }) => {
    const identifier = String(d.identifier ?? "").trim();
    const password = String(d.password ?? "");
    if (!identifier || !password || password.length > 72) throw new Error("Preencha os dados");
    return { identifier, password };
  })
  .handler(async ({ data }) => {
    let email = data.identifier.toLowerCase();
    if (!email.includes("@")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: shop } = await supabaseAdmin.from("barbershops").select("owner_email").eq("owner_phone", digits(data.identifier)).maybeSingle();
      if (!shop?.owner_email) throw new Error("Telefone ou senha incorretos");
      email = shop.owner_email;
    }
    const { createClient } = await import("@supabase/supabase-js");
    const c = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: s, error } = await c.auth.signInWithPassword({ email, password: data.password });
    if (error || !s.session) throw new Error("E-mail/telefone ou senha incorretos");
    return { access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
