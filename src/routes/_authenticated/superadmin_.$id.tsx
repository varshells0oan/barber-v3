import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Shield, Building2, Copy, ExternalLink, Save,
  Scissors, UserCog, Settings, Mail, RefreshCw, X, CheckCircle2, AlertCircle,
  LinkIcon, CalendarDays, User, KeyRound,
} from "lucide-react";
import { buildInviteUrl, generateInviteToken, hashInviteToken } from "@/lib/invite-token";

export const Route = createFileRoute("/_authenticated/superadmin_/$id")({
  ssr: false,
  component: SuperAdminDetail,
});

type Barbershop = { id: string; name: string; slug: string; status: string };
type Invite = {
  id: string; email: string;
  status: "pending" | "accepted" | "cancelled";
  expires_at: string; created_at: string;
};
type Tab = "resumo" | "links" | "servicos" | "barbeiros" | "config" | "acesso";

async function createInviteFor(barbershopId: string, email: string): Promise<string> {
  const token = generateInviteToken();
  const token_hash = await hashInviteToken(token);
  const { error } = await supabase.rpc("create_barbershop_invite", {
    _barbershop_id: barbershopId, _email: email, _token_hash: token_hash,
  });
  if (error) throw error;
  return buildInviteUrl(token);
}

function SuperAdminDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [tab, setTab] = useState<Tab>("resumo");
  const [counts, setCounts] = useState<{ services: number; barbers: number; hasSettings: boolean }>(
    { services: 0, barbers: 0, hasSettings: false }
  );

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!(roles ?? []).some((r: any) => r.role === "superadmin")) return navigate({ to: "/auth" });
      setChecking(false);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    const { data, error } = await supabase.from("barbershops")
      .select("id,name,slug,status").eq("id", id).maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) { toast.error("Barbearia não encontrada"); return navigate({ to: "/superadmin" }); }
    setShop(data as Barbershop);

    const [{ count: sc }, { count: bc }, { data: ss }] = await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", id),
      supabase.from("barbers").select("id", { count: "exact", head: true }).eq("barbershop_id", id),
      supabase.from("shop_settings").select("id").eq("barbershop_id", id).limit(1),
    ]);
    setCounts({ services: sc ?? 0, barbers: bc ?? 0, hasSettings: (ss?.length ?? 0) > 0 });
  };

  if (checking || !shop) {
    return (
      <div className="dark min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          Carregando…
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "resumo", label: "Resumo", icon: Building2 },
    { id: "links", label: "Links", icon: LinkIcon },
    { id: "servicos", label: "Serviços", icon: Scissors },
    { id: "barbeiros", label: "Barbeiros", icon: UserCog },
    { id: "config", label: "Configurações", icon: Settings },
    { id: "acesso", label: "Convite / Acesso", icon: Mail },
  ];

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/25 opacity-40 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-chart-4/20 opacity-30 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link to="/superadmin" className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/40 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <div className="ml-1 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-3 shadow-lg shadow-primary/30">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-base">{shop.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">/{shop.slug}</span>
            </div>
          </div>
          <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-medium ${
            shop.status === "active"
              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-muted text-muted-foreground"
          }`}>
            {shop.status === "active" ? "Ativa" : "Inativa"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        <div className="scrollbar-hide mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-border/50 bg-card/40 p-1.5 backdrop-blur-xl">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                tab === t.id
                  ? "bg-gradient-to-br from-primary to-chart-3 text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "resumo" && <ResumoTab shop={shop} onSaved={load} counts={counts} />}
        {tab === "links" && <LinksTab shop={shop} />}
        {tab === "servicos" && (
          <QuickTab
            title="Serviços"
            description={`${counts.services} serviço(s) cadastrado(s).`}
            href={`/${shop.slug}/admin/servicos`}
            hint="Cadastre, edite preço, duração e ative/desative serviços."
          />
        )}
        {tab === "barbeiros" && (
          <QuickTab
            title="Barbeiros"
            description={`${counts.barbers} barbeiro(s) cadastrado(s).`}
            href={`/${shop.slug}/admin/barbeiros`}
            hint="Cadastre barbeiros, comissão, horário individual e status."
          />
        )}
        {tab === "config" && (
          <QuickTab
            title="Configurações"
            description={counts.hasSettings ? "Configurações da loja salvas." : "Sem configurações ainda."}
            href={`/${shop.slug}/admin/configuracoes`}
            hint="Horário da loja, datas bloqueadas e regras de agendamento."
          />
        )}
        {tab === "acesso" && <AcessoTab shop={shop} counts={counts} />}
      </main>
    </div>
  );
}

function ResumoTab({ shop, onSaved, counts }: { shop: Barbershop; onSaved: () => void; counts: { services: number; barbers: number; hasSettings: boolean } }) {
  const [name, setName] = useState(shop.name);
  const [slug, setSlug] = useState(shop.slug);
  const [status, setStatus] = useState<"active" | "inactive">(shop.status as any);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!/^[a-z0-9-]+$/.test(slug)) return toast.error("Slug inválido (a-z, 0-9, -)");
    setSaving(true);
    const { error } = await supabase.rpc("update_barbershop_basic", {
      _id: shop.id, _name: name.trim(), _slug: slug.trim(), _status: status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    onSaved();
  };

  const ready = counts.services > 0 && counts.barbers > 0 && counts.hasSettings && shop.status === "active";

  return (
    <div className="grid gap-4">
      <div className={`rounded-xl border p-4 ${ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          {ready ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
          {ready ? "Pronta para apresentação" : "Faltam itens para apresentar"}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>{counts.services > 0 ? "✓" : "•"} Serviços cadastrados ({counts.services})</li>
          <li>{counts.barbers > 0 ? "✓" : "•"} Barbeiros cadastrados ({counts.barbers})</li>
          <li>{counts.hasSettings ? "✓" : "•"} Configurações da loja</li>
          <li>{shop.status === "active" ? "✓" : "•"} Barbearia ativa</li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Dados básicos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="w-full rounded-md border border-input bg-background px-3 py-2" />
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
        <button onClick={save} disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function QuickTab({ title, description, href, hint }: { title: string; description: string; href: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <a href={href}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
        <ExternalLink className="h-4 w-4" /> Abrir editor completo
      </a>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Abre o painel do admin da barbearia — como superadmin, você tem acesso total.
      </p>
    </div>
  );
}

function LinksTab({ shop }: { shop: Barbershop }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const groups = useMemo(() => ([
    {
      title: "Cliente (público)",
      icon: CalendarDays,
      hint: "Compartilhe com os clientes finais para verem a barbearia e agendarem.",
      links: [
        { label: "Página da barbearia", url: `${origin}/${shop.slug}` },
        { label: "Agendar horário", url: `${origin}/${shop.slug}/agendar` },
        { label: "Meus agendamentos", url: `${origin}/${shop.slug}/meus-agendamentos` },
      ],
    },
    {
      title: "Dono da barbearia (admin)",
      icon: User,
      hint: "Entregue esses links + as credenciais (usuário/senha) ao dono.",
      links: [
        { label: "Login do dono", url: `${origin}/${shop.slug}/entrar` },
        { label: "Painel admin (após login)", url: `${origin}/${shop.slug}/admin` },
      ],
    },
    {
      title: "Barbeiro",
      icon: KeyRound,
      hint: "Se o barbeiro tiver credenciais, ele entra pela tela de login; caso contrário, o painel é aberto.",
      links: [
        { label: "Painel do barbeiro", url: `${origin}/${shop.slug}/barbeiro` },
      ],
    },
  ]), [origin, shop.slug]);

  return (
    <div className="grid gap-4">
      {groups.map((g) => (
        <div key={g.title} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <g.icon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">{g.title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{g.hint}</p>
          <div className="mt-3 grid gap-2">
            {g.links.map((l) => <LinkRow key={l.label} label={l.label} url={l.url} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function AcessoTab({ shop, counts }: { shop: Barbershop; counts: { services: number; barbers: number; hasSettings: boolean } }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const links = useMemo(() => ([
    { label: "Página pública", url: `${origin}/${shop.slug}` },
    { label: "Página de agendamento", url: `${origin}/${shop.slug}/agendar` },
    { label: "Painel do admin", url: `${origin}/${shop.slug}/admin` },
  ]), [origin, shop.slug]);

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Links para entregar ao cliente</h2>
        <div className="mt-3 grid gap-2">
          {links.map((l) => (
            <LinkRow key={l.label} label={l.label} url={l.url} />
          ))}
        </div>
        {(counts.services === 0 || counts.barbers === 0) && (
          <p className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-500">
            Atenção: agendamento só funcionará com serviços e barbeiros cadastrados.
          </p>
        )}
      </div>

      <InvitesPanel barbershopId={shop.id} />
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Copiado"); }
    catch { toast.error("Não foi possível copiar"); }
  };
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs">
      <div className="flex-1 min-w-0">
        <div className="text-muted-foreground">{label}</div>
        <div className="truncate font-mono">{url}</div>
      </div>
      <button onClick={copy} className="rounded p-1.5 text-muted-foreground hover:text-foreground" title="Copiar">
        <Copy className="h-4 w-4" />
      </button>
      <a href={url} target="_blank" rel="noreferrer"
        className="rounded p-1.5 text-muted-foreground hover:text-foreground" title="Abrir">
        <ExternalLink className="h-4 w-4" />
      </a>
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
    const { data, error } = await supabase.from("barbershop_invites")
      .select("id,email,status,expires_at,created_at")
      .eq("barbershop_id", barbershopId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Invite[]) ?? []);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [barbershopId]);

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
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">Convite do dono/admin</h2>
      <div className="mt-3 flex gap-2">
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
                <button title="Gerar novo link (invalida o anterior)" onClick={() => generate(inv.email)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button title="Cancelar" onClick={() => cancel(inv.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {inv.status !== "pending" && (
              <button title="Novo convite para este email" onClick={() => generate(inv.email)}
                className="rounded p-1 text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        O link do convite só é mostrado no momento da geração e é copiado automaticamente.
      </p>
    </div>
  );
}
