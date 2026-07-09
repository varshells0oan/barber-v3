import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$slug/admin/barbeiros")({
  component: BarbersPage,
});

type Hours = Record<string, { start: string; end: string } | null>;

type BarberForm = {
  id?: string;
  name: string;
  phone: string;
  photo_url: string;
  specialty: string;
  bio: string;
  commission_percent: number;
  active: boolean;
  work_hours: Hours;
  blocked_dates: string[];
};

const DEFAULT_HOURS: Hours = {
  "1": { start: "09:00", end: "19:00" },
  "2": { start: "09:00", end: "19:00" },
  "3": { start: "09:00", end: "19:00" },
  "4": { start: "09:00", end: "19:00" },
  "5": { start: "09:00", end: "19:00" },
  "6": { start: "09:00", end: "17:00" },
};

const DAYS = [
  { key: "0", label: "Dom" },
  { key: "1", label: "Seg" },
  { key: "2", label: "Ter" },
  { key: "3", label: "Qua" },
  { key: "4", label: "Qui" },
  { key: "5", label: "Sex" },
  { key: "6", label: "Sáb" },
];

const empty: BarberForm = {
  name: "",
  phone: "",
  photo_url: "",
  specialty: "",
  bio: "",
  commission_percent: 50,
  active: true,
  work_hours: DEFAULT_HOURS,
  blocked_dates: [],
};

function BarbersPage() {
  const { slug } = Route.useParams();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<BarberForm | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const load = async () => {
    const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
    const id = await getDefaultBarbershopId(slug);
    setBarbershopId(id);
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("barbershop_id", id)
      .order("created_at");
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
  }, [slug]);

  const save = async () => {
    if (!editing) return;
    const payload: any = { ...editing };
    const id = payload.id;
    delete payload.id;
    let q;
    if (id) {
      q = supabase.from("barbers").update(payload).eq("id", id);
    } else {
      const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
      payload.barbershop_id = await getDefaultBarbershopId(slug);
      q = supabase.from("barbers").insert(payload);
    }
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover barbeiro?")) return;
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Barbeiros</h1>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              {b.photo_url ? (
                <img src={b.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                  {b.name[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.name}</span>
                  {!b.active && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      inativo
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{b.specialty}</div>
                <div className="text-xs text-muted-foreground">
                  Comissão: {b.commission_percent}%
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setEditing({
                      id: b.id,
                      name: b.name,
                      phone: b.phone ?? "",
                      photo_url: b.photo_url ?? "",
                      specialty: b.specialty ?? "",
                      bio: b.bio ?? "",
                      commission_percent: Number(b.commission_percent),
                      active: b.active,
                      work_hours: (b.work_hours as Hours) ?? DEFAULT_HOURS,
                      blocked_dates: (b.blocked_dates as string[]) ?? [],
                    })
                  }
                  className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(b.id)}
                  className="rounded p-2 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? "Editar barbeiro" : "Novo barbeiro"}
            </h2>
            <div className="mt-4 grid gap-3">
              <Field label="Nome">
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="URL da foto">
                <input
                  value={editing.photo_url}
                  onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Especialidade">
                <input
                  value={editing.specialty}
                  onChange={(e) => setEditing({ ...editing, specialty: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={editing.bio}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Comissão (%)">
                <input
                  type="number"
                  value={editing.commission_percent}
                  onChange={(e) =>
                    setEditing({ ...editing, commission_percent: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Ativo
              </label>

              <div className="mt-2 rounded-md border border-border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Horário de trabalho
                </div>
                <div className="grid gap-1.5">
                  {DAYS.map((d) => {
                    const v = editing.work_hours?.[d.key];
                    const closed = !v;
                    return (
                      <div key={d.key} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="w-10 font-medium">{d.label}</span>
                        <label className="flex items-center gap-1 text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={!closed}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                work_hours: {
                                  ...editing.work_hours,
                                  [d.key]: e.target.checked
                                    ? { start: "09:00", end: "18:00" }
                                    : null,
                                },
                              })
                            }
                          />
                          Trabalha
                        </label>
                        <input
                          type="time"
                          disabled={closed}
                          value={v?.start ?? ""}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              work_hours: {
                                ...editing.work_hours,
                                [d.key]: { ...(v ?? { end: "18:00", start: "09:00" }), start: e.target.value },
                              },
                            })
                          }
                          className="rounded border border-input bg-background px-2 py-1 disabled:opacity-50"
                        />
                        <span className="text-muted-foreground">até</span>
                        <input
                          type="time"
                          disabled={closed}
                          value={v?.end ?? ""}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              work_hours: {
                                ...editing.work_hours,
                                [d.key]: { ...(v ?? { start: "09:00", end: "18:00" }), end: e.target.value },
                              },
                            })
                          }
                          className="rounded border border-input bg-background px-2 py-1 disabled:opacity-50"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Field label="Datas bloqueadas (folgas / férias — YYYY-MM-DD, uma por linha)">
                <textarea
                  value={editing.blocked_dates.join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      blocked_dates: e.target.value
                        .split(/\n+/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                  placeholder="2026-07-10"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
