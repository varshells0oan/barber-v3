import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function PublicHeader({ shopName = "Barbearia Azul" }: { shopName?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="text-lg">{shopName}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link to="/meus-agendamentos" className="text-muted-foreground hover:text-foreground">
            Meus agendamentos
          </Link>
          <Link
            to="/agendar"
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Agendar
          </Link>
        </nav>
      </div>
    </header>
  );
}
