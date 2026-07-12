import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { resolvePreset } from "@/lib/theme-presets";

type Props = {
  preset?: string | null;
  customColors?: string[] | null;
  slug?: string;
  children: ReactNode;
  className?: string;
};

const LS_PREFIX = "public-theme-preset:";
const LS_CUSTOM_PREFIX = "public-theme-custom:";

/**
 * Wraps public-facing pages and injects the barbershop's chosen color palette
 * as CSS variables scoped to the subtree. Caches the last-used preset per slug
 * in localStorage to avoid a flash of the default theme while the shop data
 * is being fetched.
 */
export function PublicTheme({
  preset,
  customColors,
  slug,
  children,
  className = "",
}: Props) {
  const [cachedPreset, setCachedPreset] = useState<string | null>(() => {
    if (typeof window === "undefined" || !slug) return null;
    try {
      return window.localStorage.getItem(LS_PREFIX + slug);
    } catch {
      return null;
    }
  });
  const [cachedCustom, setCachedCustom] = useState<string[] | null>(() => {
    if (typeof window === "undefined" || !slug) return null;
    try {
      const raw = window.localStorage.getItem(LS_CUSTOM_PREFIX + slug);
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    try {
      if (preset) {
        window.localStorage.setItem(LS_PREFIX + slug, preset);
        setCachedPreset(preset);
      }
      if (customColors && customColors.length >= 4) {
        window.localStorage.setItem(
          LS_CUSTOM_PREFIX + slug,
          JSON.stringify(customColors),
        );
        setCachedCustom(customColors);
      }
    } catch {
      /* ignore */
    }
  }, [slug, preset, customColors]);

  const p = resolvePreset(
    preset ?? cachedPreset,
    customColors ?? cachedCustom,
  );

  return (
    <div
      className={`dark min-h-screen bg-background text-foreground ${className}`}
      style={p.vars as CSSProperties}
    >
      {children}
    </div>
  );
}
