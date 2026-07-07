import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl, cleanPhone, formatDateBR, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import { Search } from "lucide-react";

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
    setLoading(true);
    const cp = cleanPhone(phone);
    const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
    const barbershopId = await getDefaultBarbershopId(slug);
    const [{ data: a }, { data: c }, { data: sh }] = await Promise.all([
      supabase.rpc("public_get_my_appointments", {
        _barbershop_id: barbershopId,
        _phone: cp,
      }),
      supabase.rpc("public_get_client_loyalty", {
        _barbershop_id: barbershopId,
        _phone: cp,
      }),
      supabase
        .from("public_shop_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle(),
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
    <div className="dark min-h-screen bg-background text-foreground">
      <PublicHeader slug={slug} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Meus agendamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Digite o WhatsApp usado no agendamento.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            onClick={search}
            disabled={loading || !phone}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> Buscar
          </button>
        </div>

        {searched && !client && (
          <p className="mt-8 rounded-md bg-muted p-4 text-sm text-muted-foreground">
            Não encontramos agendamentos com esse número.
          </p>
        )}

        {client && shop && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">Programa de fidelidade</div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {client.loyalty_points % shop.loyalty_target}/{shop.loyalty_target}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${((client.loyalty_points % shop.loyalty_target) / shop.loyalty_target) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Complete {shop.loyalty_target} atendimentos e ganhe: {shop.loyalty_reward}
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Próximos</h2>
            <div className="mt-3 grid gap-3">
              {upcoming.map((a) => (
                <ApptCard key={a.id} a={a} />
              ))}
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
            <div className="mt-3 grid gap-3">
              {history.map((a) => (
                <ApptCard key={a.id} a={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ApptCard({ a }: { a: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-foreground">{a.service_name}</div>
          <div className="text-sm text-muted-foreground">
            {formatDateBR(a.date)} · {a.time} · {a.barber_name}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}
          >
            {STATUS_LABEL[a.status]}
          </span>
          <div className="mt-1 text-sm font-semibold text-foreground">{brl(a.price)}</div>
        </div>
      </div>
    </div>
  );
}
