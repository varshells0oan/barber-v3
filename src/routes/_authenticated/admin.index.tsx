import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { Calendar, DollarSign, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [appts, setAppts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: false })
      .limit(200)
      .then(({ data }) => setAppts(data ?? []));
  }, []);

  const today = todayISO();
  const month = today.slice(0, 7);
  const done = appts.filter((a) => a.status === "atendido");
  const todayRev = done.filter((a) => a.date === today).reduce((s, a) => s + Number(a.price), 0);
  const monthRev = done.filter((a) => a.date.startsWith(month)).reduce((s, a) => s + Number(a.price), 0);
  const todayCount = appts.filter((a) => a.date === today).length;
  const monthDone = done.filter((a) => a.date.startsWith(month)).length;
  const ticket = monthDone ? monthRev / monthDone : 0;

  const upcoming = appts
    .filter((a) => a.date === today && ["pendente", "confirmado"].includes(a.status))
    .sort((a, b) => a.time.localeCompare(b.time));

  const stats = [
    { label: "Faturamento hoje", value: brl(todayRev), icon: DollarSign },
    { label: "Faturamento do mês", value: brl(monthRev), icon: TrendingUp },
    { label: "Agendamentos hoje", value: todayCount, icon: Calendar },
    { label: "Ticket médio", value: brl(ticket), icon: Users },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Visão geral da barbearia</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Próximos hoje</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem agendamentos ativos hoje.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{a.time} — {a.client_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.service_name} · {a.barber_name}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}>
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
