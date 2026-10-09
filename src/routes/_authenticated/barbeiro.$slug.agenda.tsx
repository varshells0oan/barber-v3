import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDateBR, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { toast } from "sonner";
import { useBarbershopId } from "@/hooks/useBarbershopId";
import { DaySlots } from "@/components/owner/DaySlots";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug/agenda")({
  component: Appointments,
});

const STATUSES = ["todos", "agendado", "confirmado", "em_atendimento", "concluido", "cancelado", "nao_compareceu"];

function Appointments() {
  const { slug } = Route.useParams();
  const barbershopId = useBarbershopId(slug);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");

  const load = () => {
    if (!barbershopId) return;
    supabase
      .from("appointments")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .order("date", { ascending: false })
      .limit(100)
      .then(({ data }) => setItems(data ?? []));
  };

  useEffect(() => {
    load();
  }, [barbershopId]);

  const update = async (id: string, s: string) => {
    const { error } = await supabase.from("appointments").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  const filtered = items.filter((a) => {
    if (status !== "todos" && a.status !== status && !(status === "agendado" && a.status === "pendente")) return false;
    if (q && !`${a.client_name} ${a.barber_name}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Agenda</h1>
        <Link to="/barbeiro/$slug/espera" params={{ slug }} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40">
          Lista de espera
        </Link>
      </div>
      {barbershopId && <DaySlots barbershopId={barbershopId} onSaved={load} />}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente ou barbeiro"
          className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3">
        {filtered.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{a.client_name}</div>
                <div className="text-sm text-muted-foreground">
                  {a.service_name} · {a.barber_name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatDateBR(a.date)} · {a.time} · {brl(a.price)}
                </div>
                {a.notes && <div className="mt-1 text-xs text-muted-foreground">Obs: {a.notes}</div>}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}
              >
                {STATUS_LABEL[a.status]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(a.status === "pendente" || a.status === "agendado") && (
                <>
                  <Btn onClick={() => update(a.id, "confirmado")}>Confirmar</Btn>
                  <Btn variant="destructive" onClick={() => update(a.id, "cancelado")}>Cancelar</Btn>
                </>
              )}
              {["pendente", "agendado", "confirmado", "em_atendimento"].includes(a.status) && (
                <>
                  {a.status !== "em_atendimento" && (
                    <Btn variant="ghost" onClick={() => update(a.id, "em_atendimento")}>Iniciar atendimento</Btn>
                  )}
                  <Btn variant="success" onClick={() => update(a.id, "concluido")}>Concluir</Btn>
                  <Btn variant="ghost" onClick={() => update(a.id, "nao_compareceu")}>
                    Não compareceu
                  </Btn>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>
        )}
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "destructive" | "success" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "border border-border text-foreground hover:bg-accent",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
