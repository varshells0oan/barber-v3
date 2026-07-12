import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { resolvePreset } from "@/lib/theme-presets";

type Props = {
  preset?: string | null;
  slug?: string;
  children: ReactNode;
  className?: string;
};

const LS_PREFIX = "public-theme-preset:";

/**
 * Wraps public-facing pages and injects the barbershop's chosen color palette
 * as CSS variables scoped to the subtree. Caches the last-used preset per slug
 * in localStorage to avoid a flash of the default theme while the shop data
 * is being fetched.
 */
export function PublicTheme({ preset, slug, children, className = "" }: Props) {
  const [cached, setCached] = useState<string | null>(() => {
    if (typeof window === "undefined" || !slug) return null;
    try {
      return window.localStorage.getItem(LS_PREFIX + slug);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!slug || !preset || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_PREFIX + slug, preset);
      setCached(preset);
    } catch {
      /* ignore */
    }
  }, [slug, preset]);

  const p = resolvePreset(preset ?? cached);

  return (
    <div
      className={`dark min-h-screen bg-background text-foreground ${className}`}
      style={p.vars as CSSProperties}
    >
      {children}
    </div>
  );
}
