import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicTheme } from "@/components/PublicTheme";
import { brl, cleanPhone, formatDateBR, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { Search, CalendarDays, Clock, Scissors, User, Sparkles, Gift, Loader2, PhoneCall } from "lucide-react";

export const Route = createFileRoute("/$slug/meus-agendamentos")({
  component: ClientArea,
});

function ClientArea() {
  const { slug } = Route.useParams();
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [appts, setAppts] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!phone) return;
    setLoading(true);
    const cp = cleanPhone(phone);
    const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
    const barbershopId = await getDefaultBarbershopId(slug);
    const [{ data: a }, { data: c }, { data: sh }] = await Promise.all([
      supabase.rpc("public_get_my_appointments", { _barbershop_id: barbershopId, _phone: cp }),
      supabase.rpc("public_get_client_loyalty", { _barbershop_id: barbershopId, _phone: cp }),
      supabase.from("public_shop_settings" as any).select("*").limit(1).maybeSingle(),
    ]);
    setClient((c && (c as any[])[0]) ?? null);
    setAppts((a as any[]) ?? []);
    setShop(sh);
    setSearched(true);
    setLoading(false);
  };

  const upcoming = appts.filter((a) => ["pendente", "confirmado"].includes(a.status));
  const history = appts.filter((a) => a.status === "atendido");

  return (
    <PublicTheme preset={shop?.theme_preset}>
      <PublicHeader slug={slug} />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_60%)]" />
        <div className="mx-auto max-w-2xl px-4 pt-12 pb-10 text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Área do cliente
          </div>
          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Seus agendamentos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulte seus horários e acompanhe seu programa de fidelidade.
          </p>

          {/* Search */}
          <div className="mx-auto mt-7 max-w-md">
            <div className="group relative flex items-center rounded-2xl border border-border bg-card/80 p-1.5 shadow-lg shadow-black/10 backdrop-blur transition focus-within:border-primary focus-within:shadow-primary/10">
              <PhoneCall className="ml-3 h-4 w-4 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <button
                onClick={search}
                disabled={loading || !phone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              Use o mesmo WhatsApp que você informou no agendamento.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {!searched && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">
              Digite seu WhatsApp acima para ver seus agendamentos.
            </p>
          </div>
        )}

        {searched && !client && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 font-medium">Nada por aqui ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Não encontramos agendamentos com esse número.
            </p>
          </div>
        )}

        {/* Loyalty */}
        {client && shop && (
          <LoyaltyCard client={client} shop={shop} />
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="mt-8">
            <SectionTitle icon={<CalendarDays className="h-4 w-4" />} title="Próximos" count={upcoming.length} />
            <div className="mt-4 grid gap-3">
              {upcoming.map((a) => <ApptCard key={a.id} a={a} highlight />)}
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section className="mt-8">
            <SectionTitle icon={<Clock className="h-4 w-4" />} title="Histórico" count={history.length} />
            <div className="mt-4 grid gap-3">
              {history.map((a) => <ApptCard key={a.id} a={a} />)}
            </div>
          </section>
        )}

        {client && upcoming.length === 0 && history.length === 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem agendamentos por aqui.
          </div>
        )}
      </div>
    </PublicTheme>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function LoyaltyCard({ client, shop }: { client: any; shop: any }) {
  const current = client.loyalty_points % shop.loyalty_target;
  const pct = (current / shop.loyalty_target) * 100;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-lg shadow-black/10">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Gift className="h-3.5 w-3.5" /> Fidelidade
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-heading text-3xl font-semibold">{current}</span>
            <span className="text-sm text-muted-foreground">/ {shop.loyalty_target}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Faltam <span className="font-medium text-foreground">{shop.loyalty_target - current}</span> atendimentos
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-right text-xs backdrop-blur">
          <div className="text-muted-foreground">Recompensa</div>
          <div className="mt-0.5 font-medium text-foreground">{shop.loyalty_reward}</div>
        </div>
      </div>
      <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ApptCard({ a, highlight = false }: { a: any; highlight?: boolean }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition hover:border-primary/40 ${
        highlight ? "border-border" : "border-border/60 opacity-90"
      }`}
    >
      {highlight && (
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/40" />
      )}
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5 text-primary" />
            <span className="truncate font-medium text-foreground">{a.service_name}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {formatDateBR(a.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {a.time}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {a.barber_name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[a.status]}`}>
            {STATUS_LABEL[a.status]}
          </span>
          <div className="text-sm font-semibold tracking-tight">{brl(a.price)}</div>
        </div>
      </div>
    </div>
  );
}
