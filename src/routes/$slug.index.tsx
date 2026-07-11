import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl } from "@/lib/format";
import {
  Scissors,
  Clock,
  Star,
  MapPin,
  Phone,
  Instagram,
  CalendarCheck,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/$slug/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Barbearia — Agende seu horário" },
      {
        name: "description",
        content:
          "Cortes, barba e cuidados masculinos com profissionais experientes. Agende online em segundos.",
      },
    ],
  }),
});

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Landing() {
  const { slug } = Route.useParams();
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { getDefaultBarbershopId } = await import("@/lib/current-barbershop");
      const bid = await getDefaultBarbershopId(slug);
      const [s, b, sh] = await Promise.all([
        supabase.from("services").select("*").eq("barbershop_id", bid).eq("active", true).order("price"),
        supabase.from("public_barbers" as any).select("*").eq("barbershop_id", bid).eq("active", true),
        supabase.from("public_shop_settings" as any).select("*").eq("barbershop_id", bid).limit(1).maybeSingle(),
      ]);
      setServices(s.data ?? []);
      setBarbers(b.data ?? []);
      setShop(sh.data);
    })();
  }, [slug]);

  const shopName = shop?.name ?? "Barbearia";
  const workHours = (shop?.work_hours ?? {}) as Record<string, { start: string; end: string }>;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <PublicHeader slug={slug} shopName={shopName} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.25), transparent 70%)",
          }}
        />
        {shop?.banner_url && (
          <img
            src={shop.banner_url}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
          />
        )}
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Estilo, precisão e atitude
            </span>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {shopName}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {shop?.description ??
                "Cortes clássicos e modernos, barba impecável e uma experiência pensada para o homem que valoriza o próprio estilo."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/$slug/agendar"
                params={{ slug }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                <CalendarCheck className="h-4 w-4" />
                Agendar agora
              </Link>
              <Link
                to="/$slug/meus-agendamentos"
                params={{ slug }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 font-medium text-foreground backdrop-blur transition hover:border-primary"
              >
                Meus agendamentos
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/60 pt-6">
              <Feature icon={ShieldCheck} label="Confirmação instantânea" />
              <Feature icon={Star} label="Profissionais avaliados" />
              <Feature icon={Clock} label="Horário flexível" />
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt={shopName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-background">
                  <Scissors className="h-24 w-24 text-primary/60" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-border bg-card/90 p-4 backdrop-blur sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avaliação média</div>
                  <div className="font-semibold text-foreground">5.0 · Clientes satisfeitos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* EQUIPE */}
      <section id="equipe" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10">
            <span className="text-xs font-medium uppercase tracking-widest text-primary">Equipe</span>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Profissionais que fazem a diferença
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <div
                key={b.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary"
              >
                <div className="aspect-square w-full overflow-hidden bg-primary/5">
                  {b.photo_url ? (
                    <img
                      src={b.photo_url}
                      alt={b.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-5xl font-semibold text-primary/60">
                      {b.name?.[0]}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg font-semibold text-foreground">{b.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" /> {b.rating ?? 5.0}
                    </span>
                  </div>
                  {b.specialty && (
                    <p className="mt-1 text-sm text-muted-foreground">{b.specialty}</p>
                  )}
                </div>
              </div>
            ))}
            {barbers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
                Equipe em breve.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* INFO / CONTATO */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-heading text-xl font-semibold text-foreground">Horário de funcionamento</h3>
            <ul className="mt-4 divide-y divide-border/60 text-sm">
              {DAY_LABELS.map((label, i) => {
                const h = workHours[String(i)];
                return (
                  <li key={i} className="flex items-center justify-between py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">
                      {h ? `${h.start} — ${h.end}` : "Fechado"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-heading text-xl font-semibold text-foreground">Contato & localização</h3>
            <div className="mt-4 space-y-3 text-sm">
              {shop?.address && (
                <a
                  className="flex items-start gap-3 text-muted-foreground transition hover:text-foreground"
                  href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" /> {shop.address}
                </a>
              )}
              {(shop?.whatsapp || shop?.phone) && (
                <a
                  className="flex items-center gap-3 text-muted-foreground transition hover:text-foreground"
                  href={`https://wa.me/${(shop.whatsapp ?? shop.phone).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="h-4 w-4 text-primary" /> {shop.whatsapp ?? shop.phone}
                </a>
              )}
              {shop?.instagram && (
                <a
                  className="flex items-center gap-3 text-muted-foreground transition hover:text-foreground"
                  href={`https://instagram.com/${shop.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram className="h-4 w-4 text-primary" /> {shop.instagram}
                </a>
              )}
            </div>

            <Link
              to="/$slug/agendar"
              params={{ slug }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              <CalendarCheck className="h-4 w-4" /> Reservar horário
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Pronto para o próximo corte?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Escolha o serviço, o profissional e o melhor horário. Leva menos de 1 minuto.
          </p>
          <Link
            to="/$slug/agendar"
            params={{ slug }}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Agendar agora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {shopName}. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}
