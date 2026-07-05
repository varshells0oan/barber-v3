import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl } from "@/lib/format";
import {
  MapPin,
  Phone,
  Instagram,
  Star,
  Clock,
  Check,
  ChevronRight,
  Calendar,
  Award,
  Sparkles,
  Scissors,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const HERO_IMG =
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=80";
const GALLERY = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1521490878406-4b1a1af86f7d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1521490683851-b3ed58ae3b3f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1596728325488-58c87691e9af?auto=format&fit=crop&w=800&q=80",
];

const DIFFERENTIALS = [
  { icon: Calendar, title: "Agendamento online", text: "Escolha barbeiro, serviço e horário em segundos." },
  { icon: Award, title: "Barbeiros premium", text: "Profissionais experientes e especializados." },
  { icon: Sparkles, title: "Ambiente exclusivo", text: "Atendimento cuidadoso do início ao fim." },
  { icon: Check, title: "Sem compromisso", text: "Cancele ou remarque com facilidade." },
];

function Home() {
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [s, b, sh] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("price"),
        supabase.from("barbers").select("*").eq("active", true),
        supabase.from("shop_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setServices(s.data ?? []);
      setBarbers(b.data ?? []);
      setShop(sh.data);
    })();
  }, []);

  const shopName = shop?.name ?? "Barbearia Azul";
  const phone = shop?.phone ?? "";
  const wa = (shop?.whatsapp ?? phone).replace(/\D/g, "");
  const instagram = shop?.instagram ?? "";
  const gallery: string[] = (shop?.gallery && shop.gallery.length > 0) ? shop.gallery : GALLERY;
  const workHours = shop?.work_hours ?? {};
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const waHref = wa ? `https://wa.me/${wa.startsWith("55") ? wa : "55" + wa}` : "#top";
  const igHref = instagram ? `https://instagram.com/${instagram.replace(/^@/, "")}` : "#top";

  return (
    <div id="top" className="dark min-h-screen bg-background text-foreground">
      <PublicHeader shopName={shopName} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(11,17,32,0.55), rgba(11,17,32,0.85) 60%, var(--background)), url(${shop?.banner_url ?? HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-28 sm:pt-28 sm:pb-40 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Scissors className="h-3 w-3" /> Est. 2020 · Barbearia Premium
          </span>
          <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            {shopName}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {shop?.description ??
              "Estilo, precisão e atendimento sob medida. Agende seu horário em poucos toques."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/agendar"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              Agendar agora
            </Link>
            <Link
              to="/meus-agendamentos"
              className="rounded-lg border border-border bg-card/60 px-6 py-3 font-medium text-foreground backdrop-blur transition hover:bg-card"
            >
              Meus agendamentos
            </Link>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="relative -mt-16 sm:-mt-20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:gap-4 lg:grid-cols-4">
          {DIFFERENTIALS.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl sm:p-5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                <d.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 font-heading text-base font-semibold text-foreground">{d.title}</div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-8 text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-primary">Serviços</span>
          <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Escolha seu estilo
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Toque em um serviço para começar seu agendamento.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.id}
              to="/agendar"
              search={{ service: s.id } as any}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{s.name}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 text-sm font-semibold text-primary">
                  {brl(s.price)}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {s.duration} min
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
          {services.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              Carregando serviços...
            </p>
          )}
        </div>
      </section>

      {/* EQUIPE */}
      <section id="equipe" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-8 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-primary">Equipe</span>
            <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Nossos barbeiros
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {barbers.map((b) => (
              <div
                key={b.id}
                className="w-64 shrink-0 rounded-2xl border border-border bg-card p-5 sm:w-auto"
              >
                <div className="flex items-center gap-4">
                  {b.photo_url ? (
                    <img
                      src={b.photo_url}
                      alt={b.name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 font-heading text-xl font-semibold text-primary">
                      {b.name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-semibold text-foreground">{b.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{b.specialty}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                      <Star className="h-3 w-3 fill-current" /> {b.rating ?? "5.0"}
                    </div>
                  </div>
                </div>
                {b.bio && (
                  <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{b.bio}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* HORÁRIO */}
      {Object.keys(workHours).length > 0 && (
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <div className="mb-8 text-center">
              <span className="text-xs font-medium uppercase tracking-widest text-primary">
                Horários
              </span>
              <h2 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Quando estamos abertos
              </h2>
            </div>
            <div className="grid gap-1.5 rounded-2xl border border-border bg-card p-5 text-sm">
              {DAY_NAMES.map((n, i) => {
                const h = workHours[String(i)];
                return (
                  <div key={i} className="flex justify-between border-b border-border/40 py-1.5 last:border-0">
                    <span className="text-muted-foreground">{n}</span>
                    <span className="font-medium text-foreground">
                      {h ? `${h.start} — ${h.end}` : "Fechado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CONTATO */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <MapPin className="h-5 w-5 text-primary" />
              <div className="mt-3 font-heading text-base font-semibold text-foreground">Endereço</div>
              <div className="mt-1 text-sm text-muted-foreground">{shop?.address ?? "—"}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <Phone className="h-5 w-5 text-primary" />
              <div className="mt-3 font-heading text-base font-semibold text-foreground">Contato</div>
              <div className="mt-1 text-sm text-muted-foreground">{phone || "—"}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <Instagram className="h-5 w-5 text-primary" />
              <div className="mt-3 font-heading text-base font-semibold text-foreground">Instagram</div>
              {instagram ? (
                <a
                  className="mt-1 block text-sm text-primary hover:underline"
                  href={igHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{instagram.replace(/^@/, "")}
                </a>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">—</div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={waHref}
              target={wa ? "_blank" : undefined}
              rel="noreferrer"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
            >
              WhatsApp
            </a>
            <a
              href={igHref}
              target={instagram ? "_blank" : undefined}
              rel="noreferrer"
              className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110"
            >
              Instagram
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {shopName}</span>
          <Link to="/auth" className="hover:text-foreground">
            Área da equipe
          </Link>
        </div>
      </footer>

      {/* CTA fixo mobile */}
      <Link
        to="/agendar"
        className="fixed inset-x-4 bottom-4 z-30 rounded-full bg-primary py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-2xl shadow-primary/40 sm:hidden"
      >
        Agendar agora
      </Link>
    </div>
  );
}
