import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

type Props = {
  shopName?: string;
  slug: string;
};

export function PublicHeader({ shopName = "Barbearia", slug }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/$slug" params={{ slug }} className="flex items-center gap-2.5 font-semibold text-foreground">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-heading text-lg tracking-tight">{shopName}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <Link to="/$slug" params={{ slug }} className="text-muted-foreground transition hover:text-foreground">
            Home
          </Link>
          <a href="#servicos" className="text-muted-foreground transition hover:text-foreground">
            Serviços
          </a>
          <a href="#equipe" className="text-muted-foreground transition hover:text-foreground">
            Equipe
          </a>
          <Link
            to="/$slug/meus-agendamentos"
            params={{ slug }}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Meus agendamentos
          </Link>
          <Link
            to="/$slug/agendar"
            params={{ slug }}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Agendar
          </Link>
        </nav>
        <Link
          to="/$slug/agendar"
          params={{ slug }}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:hidden"
        >
          Agendar
        </Link>
      </div>
    </header>
  );
}
