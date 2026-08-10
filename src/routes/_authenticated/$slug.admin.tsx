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
  X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/$slug/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { slug } = Route.useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const base = `/${slug}/admin`;
  const navGroups = [
    {
      label: "Visão Geral",
      items: [
        { to: "/$slug/admin", params: { slug }, exact: true, label: "Dashboard", icon: LayoutDashboard },
        { to: "/$slug/admin/agendamentos", params: { slug }, label: "Agendamentos", icon: Calendar },
      ],
    },
    {
      label: "Cadastro",
      items: [
        { to: "/$slug/admin/barbeiros", params: { slug }, label: "Barbeiros", icon: UserCog },
        { to: "/$slug/admin/servicos", params: { slug }, label: "Serviços", icon: Scissors },
        { to: "/$slug/admin/clientes", params: { slug }, label: "Clientes", icon: Users },
      ],
    },
    {
      label: "Gestão",
      items: [
        { to: "/$slug/admin/financeiro", params: { slug }, label: "Financeiro", icon: DollarSign },
        { to: "/$slug/admin/configuracoes", params: { slug }, label: "Configurações", icon: Settings },
      ],
    },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map((n) => {
              const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as any}
                  params={(n as any).params}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const Brand = () => (
    <div className="border-b border-border/60 p-4">
      <Link to="/$slug/admin" params={{ slug }} className="flex items-center gap-2 font-heading text-lg text-foreground">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Scissors className="h-4 w-4" />
        </div>
        Admin
      </Link>
    </div>
  );

  const Footer = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="border-t border-border/60 p-3">
      <Link
        to="/$slug/barbeiro"
        params={{ slug }}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      >
        <UserCog className="h-4 w-4" /> Painel barbeiro
      </Link>
      <button
        onClick={signOut}
        className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-card/40 backdrop-blur lg:flex">
        <Brand />
        <NavList />
        <Footer />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-card/60 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-heading text-lg">Admin</span>
        <button onClick={signOut} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
          Sair
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border/60 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <Link to="/$slug/admin" params={{ slug }} onClick={() => setOpen(false)} className="flex items-center gap-2 font-heading text-lg">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Scissors className="h-4 w-4" />
                </div>
                Admin
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <Footer onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
