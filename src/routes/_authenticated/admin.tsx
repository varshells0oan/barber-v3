import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  DollarSign,
  Settings,
  UserCog,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: Calendar },
  { to: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <Link to="/admin" className="flex items-center gap-2 font-semibold text-foreground">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-4 w-4" />
            </div>
            Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/admin" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <Link
            to="/barbeiro"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <UserCog className="h-4 w-4" /> Painel barbeiro
          </Link>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => setOpen(!open)}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">Admin</span>
        <button onClick={signOut} className="ml-auto text-sm text-muted-foreground">
          Sair
        </button>
      </header>
      {open && (
        <div className="border-b border-border bg-card p-2 lg:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
