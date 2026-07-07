import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, History, DollarSign, LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$slug/barbeiro")({
  component: BarberLayout,
});

const nav = [
  { to: "/barbeiro", label: "Agenda", icon: Calendar },
  { to: "/barbeiro/historico", label: "Histórico", icon: History },
  { to: "/barbeiro/ganhos", label: "Ganhos", icon: DollarSign },
];

function BarberLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-card/60 px-4 backdrop-blur">
        <span className="font-heading text-lg">Painel do Barbeiro</span>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link to="/admin" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Shield className="h-4 w-4" /> Admin
          </Link>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 border-t border-border bg-card">
        {nav.map((n) => {
          const active = loc.pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
