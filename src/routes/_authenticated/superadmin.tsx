import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/superadmin")({
  ssr: false,
  component: SuperAdminPage,
});

type Barbershop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

function SuperAdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const isSuper = (roles ?? []).some((r: any) => r.role === "superadmin");
      if (!isSuper) return navigate({ to: "/admin" });
      setAllowed(true);
      setChecking(false);
      load();
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("barbershops")
      .select("id,name,slug,status,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Barbershop[]) ?? []);
    setLoading(false);
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return toast.error("Nome e slug obrigatórios");
    if (!/^[a-z0-9-]+$/.test(slug)) return toast.error("Slug inválido (use a-z, 0-9, -)");
    setSaving(true);
    try {
      const { data: shop, error } = await supabase
        .from("barbershops")
        .insert({ name: name.trim(), slug: slug.trim(), status })
        .select("id")
        .single();
      if (error) throw error;

      if (adminEmail.trim()) {
        // Tenta vincular admin se o usuário já existe
        const { data: existing } = await supabase
          .from("user_roles")
          .select("user_id")
          .limit(1);
        // Não temos acesso a auth.users pelo client; instruímos manual se necessário.
        // Placeholder: apenas informa que o email deve se cadastrar antes.
        void existing;
        toast.message(
          `Barbearia criada. Peça para ${adminEmail} se cadastrar em /auth; depois atribua o papel admin.`,
        );
      } else {
        toast.success("Barbearia criada");
      }

      setName("");
      setSlug("");
      setAdminEmail("");
      setStatus("active");
      setShowForm(false);
      load();
      void shop;
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (b: Barbershop) => {
    const next = b.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("barbershops")
      .update({ status: next })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

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
        <button
          onClick={signOut}
          className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Barbearias</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as barbearias do SaaS.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova barbearia
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={create}
            className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Nome</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(slugify(e.target.value));
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="Barbearia João"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Slug</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="barbearia-joao"
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">
                  Email do dono (opcional)
                </span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="dono@exemplo.com"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Criar barbearia"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 grid gap-2">
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma barbearia cadastrada.</p>
          )}
          {items.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">/{b.slug}</div>
              </div>
              <button
                onClick={() => toggleStatus(b)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  b.status === "active"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {b.status === "active" ? "Ativa" : "Inativa"}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
