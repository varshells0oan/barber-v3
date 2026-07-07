import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingSaaS,
  head: () => ({
    meta: [
      { title: "BarberSaaS — Sistema para barbearias" },
      { name: "description", content: "Plataforma completa para barbearias: agenda online, gestão de barbeiros, financeiro e fidelidade." },
      { property: "og:title", content: "BarberSaaS" },
      { property: "og:description", content: "Sistema completo para gerenciar sua barbearia." },
    ],
  }),
});

type Shop = { slug: string; name: string; logo_url: string | null };

function LandingSaaS() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    supabase
      .from("barbershops")
      .select("slug,name,logo_url")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setShops((data ?? []) as Shop[]));

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if ((roles ?? []).some((r: any) => r.role === "superadmin")) setIsSuperadmin(true);
    });
  }, []);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-heading text-lg">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </div>
            BarberSaaS
          </div>
          <nav className="flex items-center gap-2 text-sm">
            {isSuperadmin && (
              <Link
                to="/superadmin"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 hover:bg-accent/40"
              >
                <ShieldCheck className="h-4 w-4" /> Superadmin
              </Link>
            )}
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <section className="text-center">
          <h1 className="font-heading text-4xl sm:text-5xl">
            Sua barbearia, <span className="text-primary">online</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Agenda online, gestão de barbeiros, financeiro e fidelidade em um só lugar.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Acessar meu painel <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {shops.length > 0 && (
          <section className="mt-20">
            <h2 className="text-center font-heading text-2xl">Barbearias na plataforma</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((s) => (
                <Link
                  key={s.slug}
                  to="/$slug"
                  params={{ slug: s.slug }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-4 hover:border-primary/50"
                >
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      <Scissors className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">/{s.slug}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BarberSaaS
      </footer>
    </div>
  );
}
