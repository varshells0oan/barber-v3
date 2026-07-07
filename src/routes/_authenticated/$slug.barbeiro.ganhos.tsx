import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/barbeiro/ganhos")({
  component: Earnings,
});

function Earnings() {
  const [items, setItems] = useState<any[]>([]);
  const [commission, setCommission] = useState<number>(50);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: barber } = await supabase
        .from("barbers")
        .select("id, commission_percent")
        .eq("user_id", uid)
        .maybeSingle();
      if (!barber) {
        setItems([]);
        return;
      }
      setCommission(Number(barber.commission_percent) || 0);
      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("status", "atendido")
        .eq("barber_id", barber.id)
        .order("date", { ascending: false })
        .limit(200);
      setItems(appts ?? []);
    })();
  }, []);

  const today = todayISO();
  const month = today.slice(0, 7);
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const sum = (arr: any[]) => arr.reduce((s, a) => s + Number(a.price), 0);
  const todayRev = sum(items.filter((a) => a.date === today));
  const weekRev = sum(items.filter((a) => new Date(a.date + "T00:00:00") >= weekAgo));
  const monthRev = sum(items.filter((a) => a.date.startsWith(month)));
  const rate = commission / 100;

  const last7: { day: string; val: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    last7.push({
      day: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()],
      val: sum(items.filter((a) => a.date === iso)),
    });
  }
  const max = Math.max(1, ...last7.map((x) => x.val));

  return (
    <div>
      <h1 className="text-xl font-semibold">Ganhos</h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Hoje" value={brl(todayRev)} />
        <Stat label="Semana" value={brl(weekRev)} />
        <Stat label="Mês" value={brl(monthRev)} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-medium">Comissão ({commission}%)</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Hoje: {brl(todayRev * rate)} · Semana: {brl(weekRev * rate)} · Mês: {brl(monthRev * rate)}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Últimos 7 dias</h2>
        <div className="mt-4 flex h-32 items-end justify-between gap-2">
          {last7.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex-1 flex items-end w-full">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${(d.val / max) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
