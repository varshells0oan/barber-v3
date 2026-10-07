import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/barbeiro/$slug/relatoriosservicos")({
  component: ServicesPage,
});

const CATS = ["corte", "barba", "combo", "tratamento", "outros"];

type Form = {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  active: boolean;
};

const empty: Form = {
  name: "",
  description: "",
  price: 0,
  duration: 30,
  category: "corte",
  active: true,
};

function ServicesPage() {
  const { slug } = Route.useParams();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);

  const load = async () => {
    const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
    const id = await getDefaultBarbershopId(slug);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", id)
      .order("price");
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
      q = supabase.from("services").update(payload).eq("id", id);
    } else {
      const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
      payload.barbershop_id = await getDefaultBarbershopId(slug);
      q = supabase.from("services").insert(payload);
    }
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover serviço?")) return;
    await supabase.from("services").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Serviços</h1>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border border-border bg-card p-4 ${!s.active ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.duration} min · {s.category}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-primary">{brl(s.price)}</div>
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() =>
                      setEditing({
                        id: s.id,
                        name: s.name,
                        description: s.description ?? "",
                        price: Number(s.price),
                        duration: s.duration,
                        category: s.category,
                        active: s.active,
                      })
                    }
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
            className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? "Editar serviço" : "Novo serviço"}
            </h2>
            <div className="mt-4 grid gap-3">
              <Input
                label="Nome"
                value={editing.name}
                onChange={(v) => setEditing({ ...editing, name: v })}
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Descrição</span>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Preço (R$)"
                  type="number"
                  value={editing.price}
                  onChange={(v) => setEditing({ ...editing, price: Number(v) })}
                />
                <Input
                  label="Duração (min)"
                  type="number"
                  value={editing.duration}
                  onChange={(v) => setEditing({ ...editing, duration: Number(v) })}
                />
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Categoria</span>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Ativo
              </label>
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

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
