import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO, STATUS_LABEL } from "@/lib/format";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Scissors,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Activity,
  Trophy,
  ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  confirmado: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  atendido: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelado: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  nao_compareceu: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function Dashboard() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setAppts(data ?? []);
        setLoading(false);
      });
  }, []);

  const today = todayISO();
  const now = new Date();
  const month = today.slice(0, 7);

  const done = appts.filter((a) => a.status === "atendido");
  const todayRev = done.filter((a) => a.date === today).reduce((s, a) => s + Number(a.price), 0);
  const monthRev = done.filter((a) => a.date.startsWith(month)).reduce((s, a) => s + Number(a.price), 0);
  const todayList = appts.filter((a) => a.date === today);
  const monthDone = done.filter((a) => a.date.startsWith(month)).length;
  const ticket = monthDone ? monthRev / monthDone : 0;

  // 7-day series
  const last7 = useMemo(() => {
    const arr: { iso: string; label: string; short: string; revenue: number; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayDone = done.filter((a) => a.date === iso);
      arr.push({
        iso,
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        short: WEEKDAYS[d.getDay()],
        revenue: dayDone.reduce((s, a) => s + Number(a.price), 0),
        count: appts.filter((a) => a.date === iso).length,
        isToday: iso === today,
      });
    }
    return arr;
  }, [appts, done, today]);

  const maxRev = Math.max(...last7.map((d) => d.revenue), 1);

  // Status breakdown today
  const statusCounts = todayList.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // Top barbers this month
  const barberAgg = new Map<string, { name: string; revenue: number; count: number }>();
  done.filter((a) => a.date.startsWith(month)).forEach((a) => {
    const k = a.barber_name ?? "—";
    const cur = barberAgg.get(k) ?? { name: k, revenue: 0, count: 0 };
    cur.revenue += Number(a.price);
    cur.count += 1;
    barberAgg.set(k, cur);
  });
  const topBarbers = [...barberAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  // Top services this month
  const serviceAgg = new Map<string, { name: string; count: number }>();
  done.filter((a) => a.date.startsWith(month)).forEach((a) => {
    const k = a.service_name ?? "—";
    const cur = serviceAgg.get(k) ?? { name: k, count: 0 };
    cur.count += 1;
    serviceAgg.set(k, cur);
  });
  const topServices = [...serviceAgg.values()].sort((a, b) => b.count - a.count).slice(0, 4);
  const maxServiceCount = Math.max(...topServices.map((s) => s.count), 1);

  const upcoming = todayList
    .filter((a) => ["pendente", "confirmado"].includes(a.status))
    .sort((a, b) => a.time.localeCompare(b.time));
  const nextOne = upcoming[0];

  const stats = [
    {
      label: "Faturamento hoje",
      value: brl(todayRev),
      icon: DollarSign,
      accent: "from-emerald-500/25 to-emerald-500/0 border-emerald-500/30 text-emerald-300",
      dot: "bg-emerald-400",
    },
    {
      label: "Faturamento do mês",
      value: brl(monthRev),
      hint: MONTHS_PT[now.getMonth()],
      icon: TrendingUp,
      accent: "from-primary/25 to-primary/0 border-primary/30 text-primary",
      dot: "bg-primary",
    },
    {
      label: "Agendamentos hoje",
      value: todayList.length,
      hint: `${upcoming.length} ativos`,
      icon: CalendarDays,
      accent: "from-sky-500/25 to-sky-500/0 border-sky-500/30 text-sky-300",
      dot: "bg-sky-400",
    },
    {
      label: "Ticket médio",
      value: brl(ticket),
      hint: `${monthDone} atendidos`,
      icon: Users,
      accent: "from-indigo-500/25 to-indigo-500/0 border-indigo-500/30 text-indigo-300",
      dot: "bg-indigo-400",
    },
  ];

  const todayLabel = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS_PT[now.getMonth()]}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">{todayLabel}</p>
          <h1 className="mt-1 font-heading text-3xl text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Panorama da barbearia em tempo real</p>
        </div>
        {nextOne && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Próximo atendimento</div>
              <div className="font-medium text-foreground">
                {nextOne.time} · {nextOne.client_name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${s.accent} p-4`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{s.value}</div>
            {s.hint && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.hint}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart + status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg">Últimos 7 dias</h2>
              <p className="text-xs text-muted-foreground">Faturamento atendido por dia</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {brl(last7.reduce((s, d) => s + d.revenue, 0))}
            </div>
          </div>

          <div className="mt-6 flex h-48 items-end gap-2">
            {last7.map((d) => {
              const h = (d.revenue / maxRev) * 100;
              return (
                <div key={d.iso} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end">
                    <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-border/40" style={{ height: "4px" }} />
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        d.isToday
                          ? "bg-gradient-to-t from-primary to-sky-400"
                          : "bg-gradient-to-t from-primary/50 to-primary/20 group-hover:from-primary/70 group-hover:to-primary/40"
                      }`}
                      style={{ height: `${Math.max(h, 2)}%` }}
                      title={`${d.label}: ${brl(d.revenue)} · ${d.count} agend.`}
                    />
                  </div>
                  <div className="text-center">
                    <div className={`text-[10px] font-medium ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {d.short}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70">{d.label.slice(0, 5)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg">Status de hoje</h2>
          <p className="text-xs text-muted-foreground">{todayList.length} agendamentos</p>

          <div className="mt-4 space-y-2">
            <StatusRow
              icon={CheckCircle2}
              label="Atendidos"
              count={statusCounts.atendido ?? 0}
              total={todayList.length}
              color="emerald"
            />
            <StatusRow
              icon={Clock}
              label="Confirmados"
              count={statusCounts.confirmado ?? 0}
              total={todayList.length}
              color="sky"
            />
            <StatusRow
              icon={AlertCircle}
              label="Pendentes"
              count={statusCounts.pendente ?? 0}
              total={todayList.length}
              color="amber"
            />
            <StatusRow
              icon={XCircle}
              label="Cancelados"
              count={statusCounts.cancelado ?? 0}
              total={todayList.length}
              color="rose"
            />
          </div>
        </section>
      </div>

      {/* Barbers + services */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg">Top barbeiros</h2>
              <p className="text-xs text-muted-foreground">Faturamento no mês</p>
            </div>
            <Link to="/admin/financeiro" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Financeiro <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {topBarbers.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem atendimentos neste mês ainda.</p>
            )}
            {topBarbers.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold ${
                    ["bg-primary/20 text-primary","bg-sky-500/20 text-sky-300","bg-indigo-500/20 text-indigo-300","bg-emerald-500/20 text-emerald-300"][i]
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.count} atendimentos</div>
                </div>
                <div className="text-sm font-semibold text-foreground">{brl(b.revenue)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg">Serviços mais pedidos</h2>
              <p className="text-xs text-muted-foreground">No mês</p>
            </div>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            {topServices.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum serviço atendido ainda.</p>
            )}
            {topServices.map((s, i) => {
              const pct = (s.count / maxServiceCount) * 100;
              const colors = ["bg-primary","bg-sky-400","bg-indigo-400","bg-emerald-400"];
              return (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.count}x</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border/50">
                    <div className={`h-full rounded-full ${colors[i]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Upcoming today */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg">Agenda de hoje</h2>
            <p className="text-xs text-muted-foreground">
              {upcoming.length === 0 ? "Sem agendamentos ativos" : `${upcoming.length} em andamento`}
            </p>
          </div>
          <Link to="/admin/agendamentos" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Ver todos <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 h-24 animate-pulse rounded-lg bg-border/30" />
        ) : upcoming.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Nada agendado por enquanto.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/40"
              >
                <div className="grid h-12 w-14 place-items-center rounded-lg bg-primary/15 text-primary">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wider opacity-70">
                      {a.time.split(":")[0]}h
                    </div>
                    <div className="text-sm font-semibold">{a.time.split(":")[1]}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{a.client_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.service_name} · {a.barber_name}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-foreground">{brl(a.price)}</div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[a.status] ?? ""}`}
                >
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  count,
  total,
  color,
}: {
  icon: any;
  label: string;
  count: number;
  total: number;
  color: "emerald" | "sky" | "amber" | "rose";
}) {
  const pct = total ? (count / total) * 100 : 0;
  const map = {
    emerald: { text: "text-emerald-300", bg: "bg-emerald-500", soft: "bg-emerald-500/10" },
    sky: { text: "text-sky-300", bg: "bg-sky-500", soft: "bg-sky-500/10" },
    amber: { text: "text-amber-300", bg: "bg-amber-500", soft: "bg-amber-500/10" },
    rose: { text: "text-rose-300", bg: "bg-rose-500", soft: "bg-rose-500/10" },
  }[color];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 ${map.text}`}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="font-medium text-foreground">{count}</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${map.soft}`}>
        <div className={`h-full rounded-full ${map.bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
