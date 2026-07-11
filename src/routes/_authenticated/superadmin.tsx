import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Plus, LogOut, Shield, Settings2, KeyRound, User, Lock,
  Search, Sparkles, ArrowUpRight, X as XIcon,
} from "lucide-react";
import { setShopAdminCredentials } from "@/lib/shop-admin.functions";

export const Route = createFileRoute("/_authenticated/superadmin")({
  ssr: false,
  component: SuperAdminPage,
});

type Barbershop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  admin_username: string | null;
  created_at: string;
};

function SuperAdminPage() {
  const navigate = useNavigate();
  const setCreds = useServerFn(setShopAdminCredentials);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credsFor, setCredsFor] = useState<Barbershop | null>(null);
  const [query, setQuery] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const isSuper = (roles ?? []).some((r: any) => r.role === "superadmin");
      if (!isSuper) return navigate({ to: "/" });
      setAllowed(true);
      setChecking(false);
      load();
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("barbershops")
      .select("id,name,slug,status,admin_username,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Barbershop[]) ?? []);
    setLoading(false);
  };

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return toast.error("Nome e slug obrigatórios");
    if (!/^[a-z0-9-]+$/.test(slug)) return toast.error("Slug inválido (use a-z, 0-9, -)");
    if (!adminUsername.trim() || !adminPassword) return toast.error("Defina usuário e senha do dono");
    setSaving(true);
    try {
      const { data: shop, error } = await supabase
        .from("barbershops")
        .insert({ name: name.trim(), slug: slug.trim(), status })
        .select("id").single();
      if (error) throw error;

      await setCreds({
        data: {
          barbershopId: shop.id,
          username: adminUsername.trim(),
          password: adminPassword,
        },
      });

      toast.success(`Barbearia criada. O dono entra em /${slug}/entrar`);
      setName(""); setSlug(""); setAdminUsername(""); setAdminPassword(""); setStatus("active");
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const saveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credsFor) return;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const u = String(fd.get("username") ?? "").trim();
    const p = String(fd.get("password") ?? "");
    if (!u || !p) return toast.error("Preencha usuário e senha");
    try {
      await setCreds({ data: { barbershopId: credsFor.id, username: u, password: p } });
      toast.success("Credenciais atualizadas");
      setCredsFor(null);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    }
  };

  const toggleStatus = async (b: Barbershop) => {
    const next = b.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("barbershops").update({ status: next }).eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (checking || !allowed) {
    return (
      <div className="dark min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          Verificando acesso…
        </div>
      </div>
    );
  }

  const filtered = items.filter((b) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q) || (b.admin_username ?? "").toLowerCase().includes(q);
  });

  const activeCount = items.filter((b) => b.status === "active").length;

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background ornament */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/25 opacity-40 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-chart-4/20 opacity-30 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-3 shadow-lg shadow-primary/30">
              <Shield className="h-4 w-4 text-primary-foreground" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-base">Superadmin</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Console central</span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 via-card/40 to-background p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Painel do proprietário
              </div>
              <h1 className="mt-3 font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
                Suas barbearias
              </h1>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Cadastre novos negócios, defina credenciais de acesso e acompanhe cada operação num só lugar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Stat label="Total" value={items.length} />
              <Stat label="Ativas" value={activeCount} accent />
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, slug ou usuário…"
              className="w-full rounded-xl border border-border/60 bg-card/40 py-2.5 pl-10 pr-3 text-sm backdrop-blur transition focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-chart-3 px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:shadow-primary/30"
          >
            <Plus className="h-4 w-4 transition group-hover:rotate-90" /> Nova barbearia
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={create} className="mt-4 grid gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg">Cadastrar barbearia</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                  className={inputCls} placeholder="Barbearia João" />
              </Field>
              <Field label="Slug (URL)">
                <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                  className={inputCls} placeholder="barbearia-joao" />
              </Field>
            </div>

            <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                <KeyRound className="h-3.5 w-3.5" /> Credenciais do dono
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field icon={<User className="h-3 w-3" />} label="Usuário">
                  <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)}
                    className={inputCls} placeholder="Barber Neto" />
                </Field>
                <Field icon={<Lock className="h-3 w-3" />} label="Senha">
                  <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    className={inputCls} placeholder="qualquer senha (ex: 123)" />
                </Field>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                O dono vai entrar em <code className="rounded bg-background/60 px-1.5 py-0.5 text-primary">/{slug || "seu-slug"}/entrar</code>
              </p>
            </div>

            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                className={`${inputCls} sm:max-w-xs`}>
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </Field>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="rounded-lg bg-gradient-to-br from-primary to-chart-3 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">
                {saving ? "Salvando…" : "Criar barbearia"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="mt-6 grid gap-3">
          {loading && (
            <div className="rounded-2xl border border-border/40 bg-card/30 p-8 text-center text-sm text-muted-foreground">
              Carregando…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                {query ? "Nenhum resultado para essa busca." : "Nenhuma barbearia cadastrada ainda."}
              </p>
            </div>
          )}
          {filtered.map((b) => (
            <div key={b.id} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition hover:border-primary/40 hover:bg-card/70">
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
                style={{ background: "radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), color-mix(in oklab, var(--color-primary) 8%, transparent), transparent 40%)" }} />
              <div className="relative flex flex-wrap items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-chart-3/20 text-primary ring-1 ring-primary/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{b.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      b.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {b.status === "active" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">/{b.slug}</span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" /> {b.admin_username ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(b)}
                    className="rounded-lg border border-border/50 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-border hover:text-foreground">
                    {b.status === "active" ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => setCredsFor(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-border hover:text-foreground">
                    <KeyRound className="h-3 w-3" /> Credenciais
                  </button>
                  <Link to="/superadmin/$id" params={{ id: b.id }}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1.5 text-[11px] font-medium text-primary ring-1 ring-primary/30 hover:bg-primary/25">
                    <Settings2 className="h-3 w-3" /> Preparar <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {credsFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md" onClick={() => setCredsFor(null)}>
          <form
            onSubmit={saveCreds}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-3 text-primary-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg leading-tight">Credenciais</h2>
                <p className="text-xs text-muted-foreground">{credsFor.name}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
              Acesso em <code className="text-primary">/{credsFor.slug}/entrar</code>
            </p>
            <div className="mt-4 grid gap-3">
              <Field icon={<User className="h-3 w-3" />} label="Usuário">
                <input name="username" defaultValue={credsFor.admin_username ?? ""} className={inputCls} />
              </Field>
              <Field icon={<Lock className="h-3 w-3" />} label="Nova senha">
                <input name="password" type="text" className={inputCls} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCredsFor(null)}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
              <button type="submit"
                className="rounded-lg bg-gradient-to-br from-primary to-chart-3 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-center ${
      accent
        ? "border-primary/30 bg-primary/10"
        : "border-border/50 bg-card/40"
    }`}>
      <div className={`font-heading text-2xl leading-none ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
