import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, LogOut, Shield, Settings2, KeyRound, User, Lock } from "lucide-react";
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
        <span className="text-sm text-muted-foreground">Verificando acesso…</span>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-card/60 px-4 backdrop-blur">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-heading text-lg">Superadmin</span>
        <button onClick={signOut} className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Barbearias</h1>
            <p className="text-sm text-muted-foreground">Cadastre barbearias e defina usuário/senha do dono.</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova barbearia
          </button>
        </div>

        {showForm && (
          <form onSubmit={create} className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Nome</span>
                <input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Barbearia João" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Slug (URL)</span>
                <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="barbearia-joao" />
              </label>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <KeyRound className="h-3.5 w-3.5" /> Credenciais do dono
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> Usuário</span>
                  <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="joao" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> Senha</span>
                  <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="qualquer senha" />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                O dono vai entrar em <code>/{slug || "seu-slug"}/entrar</code> com esse usuário e senha.
              </p>
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 sm:max-w-xs">
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {saving ? "Salvando…" : "Criar barbearia"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
            </div>
          </form>
        )}

        <div className="mt-6 grid gap-2">
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma barbearia cadastrada.</p>}
          {items.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    /{b.slug} · usuário: <code>{b.admin_username ?? "—"}</code>
                  </div>
                </div>
                <Link to="/superadmin/$id" params={{ id: b.id }}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/25">
                  <Settings2 className="h-3 w-3" /> Preparar
                </Link>
                <button onClick={() => setCredsFor(b)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <KeyRound className="h-3 w-3" /> Credenciais
                </button>
                <button onClick={() => toggleStatus(b)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    b.status === "active" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {b.status === "active" ? "Ativa" : "Inativa"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {credsFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setCredsFor(null)}>
          <form
            onSubmit={saveCreds}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Credenciais — {credsFor.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              O dono entra em <code>/{credsFor.slug}/entrar</code>
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> Usuário</span>
              <input
                name="username"
                defaultValue={credsFor.admin_username ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> Nova senha</span>
              <input
                name="password"
                type="text"
                placeholder="deixe em branco para gerar erro"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCredsFor(null)}
                className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
              <button type="submit"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
