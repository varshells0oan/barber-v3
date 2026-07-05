import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, todayISO, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/barbeiro/")({
  component: Agenda,
});

function Agenda() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<any[]>([]);

  const load = () =>
    supabase
      .from("appointments")
      .select("*")
      .eq("date", date)
      .order("time")
      .then(({ data }) => setItems(data ?? []));

  useEffect(() => {
    load();
  }, [date]);

  const days = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return {
        iso: d.toISOString().slice(0, 10),
        label: d.getDate(),
        dow: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getDay()],
      };
    });
  }, []);

  const update = async (id: string, s: string) => {
    const { error } = await supabase.from("appointments").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  const upcoming = items.filter((a) => ["pendente", "confirmado"].includes(a.status));
  const done = items.filter((a) => a.status === "atendido");
  const stats = {
    total: items.length,
    pendentes: upcoming.length,
    atendidos: done.length,
  };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setDate(d.iso)}
            className={`flex flex-col rounded-lg border p-2 min-w-[56px] ${
              date === d.iso
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            <span className="text-[10px] uppercase">{d.dow}</span>
            <span className="text-lg font-semibold">{d.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pendentes" value={stats.pendentes} />
        <Stat label="Atendidos" value={stats.atendidos} />
      </div>

      <h2 className="mt-6 font-semibold">Ativos</h2>
      <div className="mt-2 grid gap-2">
        {upcoming.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">
                  {a.time} — {a.client_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.service_name} · {brl(a.price)} · {a.duration} min
                </div>
                {a.notes && <div className="mt-1 text-xs text-muted-foreground">Obs: {a.notes}</div>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLOR[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => update(a.id, "atendido")}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
              >
                <Check className="h-3 w-3" /> Atendido
              </button>
              <button
                onClick={() => update(a.id, "nao_compareceu")}
                className="rounded border border-border px-2 py-1 text-xs"
              >
                Faltou
              </button>
              <button
                onClick={() => update(a.id, "cancelado")}
                className="ml-auto rounded p-1 text-rose-600 hover:bg-rose-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">Nada por aqui.</p>
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mt-6 font-semibold">Concluídos</h2>
          <div className="mt-2 grid gap-2">
            {done.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-3 opacity-70">
                <div className="flex items-center justify-between text-sm">
                  <span>{a.time} — {a.client_name}</span>
                  <span className="font-medium text-emerald-600">{brl(a.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
