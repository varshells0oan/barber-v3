import { CSSProperties, ReactNode } from "react";
import { resolvePreset } from "@/lib/theme-presets";

type Props = {
  preset?: string | null;
  children: ReactNode;
  className?: string;
};

/**
 * Wraps public-facing pages and injects the barbershop's chosen color palette
 * as CSS variables scoped to the subtree. Always renders in dark mode.
 */
export function PublicTheme({ preset, children, className = "" }: Props) {
  const p = resolvePreset(preset);
  return (
    <div
      className={`dark min-h-screen bg-background text-foreground ${className}`}
      style={p.vars as CSSProperties}
    >
      {children}
    </div>
  );
}
