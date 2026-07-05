import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { brl } from "@/lib/format";
import { Scissors, MapPin, Phone, Instagram, Star, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

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

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader shopName={shopName} />

      {/* Hero */}
      <section
        className="relative border-b border-border"
        style={{
          backgroundImage: shop?.banner_url
            ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.95)), url(${shop.banner_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            {shopName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {shop?.description ?? "Agende seu corte online em poucos toques."}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/agendar"
              className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Agendar agora
            </Link>
            <Link
              to="/meus-agendamentos"
              className="rounded-md border border-border bg-card px-6 py-3 font-medium text-foreground hover:bg-accent"
            >
              Meus agendamentos
            </Link>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-foreground">Serviços</h2>
        <p className="mt-1 text-sm text-muted-foreground">Clique em um serviço para agendar.</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.id}
              to="/agendar"
              search={{ service: s.id } as any}
              className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-foreground">{s.name}</h3>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {brl(s.price)}
                </span>
              </div>
              {s.description && (
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              )}
              <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {s.duration} min
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Barbeiros */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-foreground">Nossa equipe</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-4">
                  {b.photo_url ? (
                    <img
                      src={b.photo_url}
                      alt={b.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                      {b.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-foreground">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">{b.specialty}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-current" /> {b.rating ?? 5.0}
                    </div>
                  </div>
                </div>
                {b.bio && <p className="mt-3 text-sm text-muted-foreground">{b.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Endereço</div>
              <div className="text-sm text-muted-foreground">{shop?.address ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Contato</div>
              <div className="text-sm text-muted-foreground">{shop?.phone ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Instagram className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Instagram</div>
              {shop?.instagram ? (
                <a
                  className="text-sm text-primary hover:underline"
                  href={`https://instagram.com/${shop.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{shop.instagram}
                </a>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {shopName}</span>
          <Link to="/auth" className="hover:text-foreground">
            Área da equipe
          </Link>
        </div>
      </footer>
    </div>
  );
}
