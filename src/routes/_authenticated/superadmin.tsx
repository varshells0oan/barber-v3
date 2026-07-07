import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, LogOut, Shield, Mail, Copy, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { buildInviteUrl, generateInviteToken, hashInviteToken } from "@/lib/invite-token";

export const Route = createFileRoute("/_authenticated/superadmin")({
  ssr: false,
  component: SuperAdminPage,
});

type Barbershop = { id: string; name: string; slug: string; status: string; created_at: string };
type Invite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "cancelled";
  expires_at: string;
  created_at: string;
};

async function createInviteFor(barbershopId: string, email: string): Promise<string> {
  const token = generateInviteToken();
  const token_hash = await hashInviteToken(token);
  const { error } = await supabase.rpc("create_barbershop_invite", {
    _barbershop_id: barbershopId,
    _email: email,
    _token_hash: token_hash,
  });
  if (error) throw error;
  return buildInviteUrl(token);
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
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
      .select("id,name,slug,status,created_at")
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
    setSaving(true);
    try {
      const { data: shop, error } = await supabase
        .from("barbershops")
        .insert({ name: name.trim(), slug: slug.trim(), status })
        .select("id").single();
      if (error) throw error;

      if (adminEmail.trim()) {
        try {
          const url = await createInviteFor(shop.id, adminEmail.trim());
          await navigator.clipboard.writeText(url).catch(() => {});
          toast.success("Convite gerado e copiado para a área de transferência");
        } catch (err: any) {
          toast.error(`Barbearia criada, mas falhou o convite: ${err.message}`);
        }
      } else {
        toast.success("Barbearia criada");
      }

      setName(""); setSlug(""); setAdminEmail(""); setStatus("active");
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar");
    } finally {
      setSaving(false);
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
            <p className="text-sm text-muted-foreground">Gerencie as barbearias e convites de admin.</p>
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
                <span className="mb-1 block text-muted-foreground">Slug</span>
                <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="barbearia-joao" />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Email do dono (opcional)</span>
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="dono@exemplo.com" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2">
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </label>
            </div>
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
              <div className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">/{b.slug}</div>
                </div>
                <button onClick={() => toggleStatus(b)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    b.status === "active" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                  {b.status === "active" ? "Ativa" : "Inativa"}
                </button>
                <button onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" /> Convites
                  {expanded === b.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
              {expanded === b.id && <InvitesPanel barbershopId={b.id} />}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function InvitesPanel({ barbershopId }: { barbershopId: string }) {
  const [list, setList] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("barbershop_invites")
      .select("id,email,status,expires_at,created_at")
      .eq("barbershop_id", barbershopId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Invite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [barbershopId]);

  const generate = async (targetEmail: string) => {
    setBusy(true);
    try {
      const url = await createInviteFor(barbershopId, targetEmail);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link do convite copiado");
      setEmail("");
      load();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setBusy(false); }
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.rpc("cancel_barbershop_invite", { _id: id });
    if (error) return toast.error(error.message);
    load();
  };

  const statusColor = (s: string, exp: string) => {
    const expired = new Date(exp) < new Date();
    if (s === "accepted") return "bg-emerald-500/15 text-emerald-500";
    if (s === "cancelled") return "bg-muted text-muted-foreground";
    if (s === "pending" && expired) return "bg-amber-500/15 text-amber-500";
    return "bg-primary/15 text-primary";
  };
  const statusLabel = (s: string, exp: string) => {
    const expired = new Date(exp) < new Date();
    if (s === "accepted") return "Aceito";
    if (s === "cancelled") return "Cancelado";
    if (s === "pending" && expired) return "Expirado";
    return "Pendente";
  };

  return (
    <div className="border-t border-border/60 px-3 py-3">
      <div className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <button onClick={() => email && generate(email)} disabled={busy || !email}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          Gerar convite
        </button>
      </div>
      <div className="mt-3 grid gap-1.5">
        {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
        {!loading && list.length === 0 && <p className="text-xs text-muted-foreground">Nenhum convite ainda.</p>}
        {list.map((inv) => (
          <div key={inv.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-xs">
            <span className="flex-1 truncate">{inv.email}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(inv.status, inv.expires_at)}`}>
              {statusLabel(inv.status, inv.expires_at)}
            </span>
            {inv.status === "pending" && (
              <>
                <button title="Gerar novo link (invalida o anterior)"
                  onClick={() => generate(inv.email)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button title="Cancelar" onClick={() => cancel(inv.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {(inv.status !== "pending") && (
              <button title="Novo convite para este email" onClick={() => generate(inv.email)}
                className="rounded p-1 text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Por segurança, o link do convite só é mostrado no momento em que é gerado. Ele é copiado automaticamente.
      </p>
    </div>
  );
}
