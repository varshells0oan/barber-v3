import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO } from "@/lib/format";
import { useBarbershopId } from "@/hooks/useBarbershopId";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug/relatoriosfinanceiro")({
  component: Financial,
});

function Financial() {
  const { slug } = Route.useParams();
  const barbershopId = useBarbershopId(slug);
  const [appts, setAppts] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);

  useEffect(() => {
    if (!barbershopId) return;
    Promise.all([
      supabase.from("appointments").select("*").eq("barbershop_id", barbershopId).limit(500),
      supabase.from("barbers").select("*").eq("barbershop_id", barbershopId),
    ]).then(([a, b]) => {
      setAppts(a.data ?? []);
      setBarbers(b.data ?? []);
    });
  }, [barbershopId]);

  const done = appts.filter((a) => a.status === "atendido");
  const today = todayISO();
  const month = today.slice(0, 7);
  const todayRev = done.filter((a) => a.date === today).reduce((s, a) => s + Number(a.price), 0);
  const monthRev = done
    .filter((a) => a.date.startsWith(month))
    .reduce((s, a) => s + Number(a.price), 0);

  const byBarber = Object.entries(
    done.reduce<Record<string, number>>((acc, a) => {
      if (!a.date.startsWith(month)) return acc;
      acc[a.barber_name] = (acc[a.barber_name] ?? 0) + Number(a.price);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxByBarber = Math.max(1, ...byBarber.map(([, v]) => v));

  const byService = Object.entries(
    done.reduce<Record<string, number>>((acc, a) => {
      acc[a.service_name] = (acc[a.service_name] ?? 0) + Number(a.price);
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Financeiro</h1>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Faturamento hoje</div>
          <div className="mt-1 text-2xl font-semibold text-primary">{brl(todayRev)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Faturamento do mês</div>
          <div className="mt-1 text-2xl font-semibold text-primary">{brl(monthRev)}</div>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Faturamento por barbeiro (mês)</h2>
        <div className="mt-4 space-y-2">
          {byBarber.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum atendimento no mês.</p>
          )}
          {byBarber.map(([name, val]) => (
            <div key={name}>
              <div className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="font-medium">{brl(val)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(val / maxByBarber) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Top serviços</h2>
        <div className="mt-4 divide-y divide-border">
          {byService.map(([name, val]) => (
            <div key={name} className="flex justify-between py-2 text-sm">
              <span>{name}</span>
              <span className="font-medium">{brl(val)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Comissões do mês</h2>
        <div className="mt-4 divide-y divide-border">
          {barbers.map((b) => {
            const rev = done
              .filter((a) => a.barber_name === b.name && a.date.startsWith(month))
              .reduce((s, a) => s + Number(a.price), 0);
            const com = rev * (Number(b.commission_percent) / 100);
            return (
              <div key={b.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Faturou {brl(rev)} · {b.commission_percent}%
                  </div>
                </div>
                <div className="font-semibold text-emerald-600">{brl(com)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
