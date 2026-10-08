import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO, STATUS_LABEL, STATUS_COLOR } from "@/lib/format";
import { useBarbershopId } from "@/hooks/useBarbershopId";
import { OwnerTools } from "@/components/owner/OwnerTools";
import { Calendar, Users, Scissors, DollarSign, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug/admin")({
  component: AdminHoje,
});

function AdminHoje() {
  const { slug } = Route.useParams();
  const barbershopId = useBarbershopId(slug);
  const [appts, setAppts] = useState<any[]>([]);
  const [counts, setCounts] = useState({ clients: 0, services: 0, barbers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barbershopId) return;
    (async () => {
      const today = todayISO();
      const [a, c, s, b] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .eq("barbershop_id", barbershopId)
          .eq("date", today)
          .order("time"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("barbershop_id", barbershopId),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", barbershopId).eq("active", true),
        supabase.from("barbers").select("id", { count: "exact", head: true }).eq("barbershop_id", barbershopId).eq("active", true),
      ]);
      setAppts(a.data ?? []);
      setCounts({ clients: c.count ?? 0, services: s.count ?? 0, barbers: b.count ?? 0 });
      setLoading(false);
    })();
  }, [barbershopId]);

  const open = appts.filter((a) => ["pendente", "agendado", "confirmado", "em_atendimento"].includes(a.status));
  const done = appts.filter((a) => ["atendido", "concluido"].includes(a.status));
  const revenue = done.reduce((sum, a) => sum + Number(a.price ?? 0), 0);

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Hoje</h1>
      {barbershopId && <OwnerTools slug={slug} barbershopId={barbershopId} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Calendar} label="Agendamentos" value={appts.length} />
        <Stat icon={Clock} label="Pendentes" value={open.length} />
        <Stat icon={DollarSign} label="Receita do dia" value={brl(revenue)} />
        <Stat icon={Users} label="Clientes" value={counts.clients} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Agenda de hoje
        </h2>
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && appts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum agendamento hoje.</p>
        )}
        <div className="grid gap-2">
          {appts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <span className="font-mono text-sm font-medium">{a.time}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.client_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.service_name} · {a.barber_name}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[a.status] ?? ""}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <QuickLink to="/barbeiro/$slug/agenda" slug={slug} label="Agenda completa" />
        <QuickLink to="/barbeiro/$slug/servicos" slug={slug} label={`Serviços (${counts.services})`} />
        <QuickLink to="/barbeiro/$slug/equipe" slug={slug} label={`Equipe (${counts.barbers})`} />
        <QuickLink to="/barbeiro/$slug/financeiro" slug={slug} label="Financeiro" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function QuickLink({ to, slug, label }: { to: string; slug: string; label: string }) {
  return (
    <Link
      to={to as any}
      params={{ slug } as any}
      className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
    >
      {label}
    </Link>
  );
}
