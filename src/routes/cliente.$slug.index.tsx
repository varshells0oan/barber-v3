import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicTheme } from "@/components/PublicTheme";
import { brl } from "@/lib/format";
import {
  Scissors,
  Clock,
  Star,
  MapPin,
  Phone,
  Instagram,
  CalendarCheck,
  
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/cliente/$slug/")({
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
  const vis = (shop?.public_visibility ?? {}) as Record<string, boolean>;
  const workHours = (shop?.work_hours ?? {}) as Record<string, { start: string; end: string }>;

  return (
    <PublicTheme preset={shop?.theme_preset} customColors={shop?.theme_custom} slug={slug}>
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
            {shop?.tagline && (
              <span className="inline-block text-xs font-medium uppercase tracking-[0.25em] text-primary">
                {shop.tagline}
              </span>
            )}
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {shopName}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {vis.descricao === false ? null : shop?.description ??
                "Cortes clássicos e modernos, barba impecável e uma experiência pensada para o homem que valoriza o próprio estilo."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/cliente/$slug/agendar"
                params={{ slug }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                <CalendarCheck className="h-4 w-4" />
                Agendar agora
              </Link>
              <Link
                to="/cliente/$slug/meus-agendamentos"
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
      <section id="equipe" className={`border-t border-border/60 bg-card/20 ${vis.equipe === false ? "hidden" : ""}`}>
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

      {/* GALERIA */}
      {Array.isArray(shop?.gallery_urls) && shop.gallery_urls.length > 0 && (
        <section id="galeria" className={`border-t border-border/60 ${vis.galeria === false ? "hidden" : ""}`}>
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-widest text-primary">Nosso trabalho</span>
                <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Cortes que falam por si
                </h2>
              </div>
              {shop?.instagram && (
                <a
                  href={`https://instagram.com/${shop.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
                >
                  <Instagram className="h-4 w-4" /> Ver mais no Instagram
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {shop.gallery_urls.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card"
                >
                  <img
                    src={url}
                    alt={`Trabalho ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DEPOIMENTOS */}
      {Array.isArray(shop?.testimonials) && shop.testimonials.length > 0 && (
        <section id="depoimentos" className={`border-t border-border/60 bg-card/20 ${vis.depoimentos === false ? "hidden" : ""}`}>
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mb-10">
              <span className="text-xs font-medium uppercase tracking-widest text-primary">Quem já passou por aqui</span>
              <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                O que os clientes dizem
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shop.testimonials.map((t: any, i: number) => (
                <figure
                  key={i}
                  className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: Math.max(1, Math.min(5, Number(t.rating) || 5)) }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                    “{t.text}”
                  </blockquote>
                  <figcaption className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                    — {t.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* INSTAGRAM CTA */}
      {shop?.instagram && vis.instagram !== false && (
        <section className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-primary">Instagram</span>
              <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Acompanhe o dia a dia da barbearia
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Bastidores, novos cortes, promoções e a rotina do salão — direto no nosso perfil.
              </p>
            </div>
            <a
              href={`https://instagram.com/${shop.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-medium text-foreground transition hover:border-primary"
            >
              <Instagram className="h-4 w-4 text-primary" /> {shop.instagram}
            </a>
          </div>
        </section>
      )}


      {/* INFO / CONTATO */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={`rounded-2xl border border-border bg-card p-6 ${vis.horarios === false ? "hidden" : ""}`}>
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
              {shop?.address && vis.endereco !== false && (
                <a
                  className="flex items-start gap-3 text-muted-foreground transition hover:text-foreground"
                  href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" /> {shop.address}
                </a>
              )}
              {(shop?.whatsapp || shop?.phone) && vis.whatsapp !== false && (
                <a
                  className="flex items-center gap-3 text-muted-foreground transition hover:text-foreground"
                  href={`https://wa.me/${(shop.whatsapp ?? shop.phone).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="h-4 w-4 text-primary" /> {shop.whatsapp ?? shop.phone}
                </a>
              )}
              {shop?.instagram && vis.instagram !== false && (
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
              to="/cliente/$slug/agendar"
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
            to="/cliente/$slug/agendar"
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
    </PublicTheme>
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
