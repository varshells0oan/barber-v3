export type ThemePresetKey =
  | "classic"
  | "vintage"
  | "modern"
  | "minimal"
  | "ocean";

export type ThemePreset = {
  key: ThemePresetKey;
  label: string;
  description: string;
  swatches: string[]; // hex, for admin preview
  vars: Record<string, string>; // CSS variables to override on the wrapper
};

// All wrappers use the "dark" base by default (public site is dark).
// We only override the semantic tokens the landing/agendar pages actually use.
export const THEME_PRESETS: Record<ThemePresetKey, ThemePreset> = {
  classic: {
    key: "classic",
    label: "Clássica",
    description: "Preto com dourado envelhecido. Barbearia tradicional e premium.",
    swatches: ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"],
    vars: {
      "--background": "oklch(0.14 0.005 60)",
      "--foreground": "oklch(0.97 0.01 80)",
      "--card": "oklch(0.19 0.008 60)",
      "--card-foreground": "oklch(0.97 0.01 80)",
      "--popover": "oklch(0.19 0.008 60)",
      "--popover-foreground": "oklch(0.97 0.01 80)",
      "--primary": "oklch(0.78 0.13 82)",
      "--primary-foreground": "oklch(0.15 0.01 60)",
      "--secondary": "oklch(0.24 0.01 60)",
      "--secondary-foreground": "oklch(0.97 0.01 80)",
      "--muted": "oklch(0.22 0.008 60)",
      "--muted-foreground": "oklch(0.70 0.02 80)",
      "--accent": "oklch(0.32 0.06 75)",
      "--accent-foreground": "oklch(0.97 0.01 80)",
      "--border": "oklch(0.28 0.01 60)",
      "--input": "oklch(0.26 0.01 60)",
      "--ring": "oklch(0.78 0.13 82)",
    },
  },
  vintage: {
    key: "vintage",
    label: "Vintage",
    description: "Marrom couro e creme. Artesanal, aconchegante e nostálgico.",
    swatches: ["#3a2416", "#6b3a2a", "#c17c4a", "#e8c07a"],
    vars: {
      "--background": "oklch(0.18 0.02 45)",
      "--foreground": "oklch(0.96 0.02 75)",
      "--card": "oklch(0.23 0.025 40)",
      "--card-foreground": "oklch(0.96 0.02 75)",
      "--popover": "oklch(0.23 0.025 40)",
      "--popover-foreground": "oklch(0.96 0.02 75)",
      "--primary": "oklch(0.72 0.13 55)",
      "--primary-foreground": "oklch(0.18 0.02 45)",
      "--secondary": "oklch(0.28 0.03 40)",
      "--secondary-foreground": "oklch(0.96 0.02 75)",
      "--muted": "oklch(0.25 0.02 40)",
      "--muted-foreground": "oklch(0.72 0.03 65)",
      "--accent": "oklch(0.38 0.07 50)",
      "--accent-foreground": "oklch(0.96 0.02 75)",
      "--border": "oklch(0.32 0.02 40)",
      "--input": "oklch(0.30 0.02 40)",
      "--ring": "oklch(0.72 0.13 55)",
    },
  },
  modern: {
    key: "modern",
    label: "Moderna",
    description: "Grafite com cobre queimado. Contemporânea e masculina.",
    swatches: ["#1a1a1a", "#2d2d2d", "#4a4a4a", "#e85d3a"],
    vars: {
      "--background": "oklch(0.17 0.005 250)",
      "--foreground": "oklch(0.98 0.005 250)",
      "--card": "oklch(0.22 0.008 250)",
      "--card-foreground": "oklch(0.98 0.005 250)",
      "--popover": "oklch(0.22 0.008 250)",
      "--popover-foreground": "oklch(0.98 0.005 250)",
      "--primary": "oklch(0.68 0.18 35)",
      "--primary-foreground": "oklch(0.99 0.005 250)",
      "--secondary": "oklch(0.26 0.008 250)",
      "--secondary-foreground": "oklch(0.98 0.005 250)",
      "--muted": "oklch(0.24 0.005 250)",
      "--muted-foreground": "oklch(0.70 0.01 250)",
      "--accent": "oklch(0.32 0.08 35)",
      "--accent-foreground": "oklch(0.98 0.005 250)",
      "--border": "oklch(0.30 0.005 250)",
      "--input": "oklch(0.28 0.005 250)",
      "--ring": "oklch(0.68 0.18 35)",
    },
  },
  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "Preto e branco puros. Elegante, editorial e discreto.",
    swatches: ["#0a0a0a", "#1f1f1f", "#a1a1a1", "#fafafa"],
    vars: {
      "--background": "oklch(0.13 0 0)",
      "--foreground": "oklch(0.98 0 0)",
      "--card": "oklch(0.18 0 0)",
      "--card-foreground": "oklch(0.98 0 0)",
      "--popover": "oklch(0.18 0 0)",
      "--popover-foreground": "oklch(0.98 0 0)",
      "--primary": "oklch(0.98 0 0)",
      "--primary-foreground": "oklch(0.13 0 0)",
      "--secondary": "oklch(0.22 0 0)",
      "--secondary-foreground": "oklch(0.98 0 0)",
      "--muted": "oklch(0.20 0 0)",
      "--muted-foreground": "oklch(0.68 0 0)",
      "--accent": "oklch(0.28 0 0)",
      "--accent-foreground": "oklch(0.98 0 0)",
      "--border": "oklch(0.26 0 0)",
      "--input": "oklch(0.24 0 0)",
      "--ring": "oklch(0.98 0 0)",
    },
  },
  ocean: {
    key: "ocean",
    label: "Oceano",
    description: "Azul profundo com ciano. Sereno, moderno e confiável.",
    swatches: ["#0c2340", "#1a4a6e", "#2d8a9e", "#5cbdb9"],
    vars: {
      "--background": "oklch(0.16 0.03 250)",
      "--foreground": "oklch(0.98 0.005 250)",
      "--card": "oklch(0.22 0.03 250)",
      "--card-foreground": "oklch(0.98 0.005 250)",
      "--popover": "oklch(0.22 0.03 250)",
      "--popover-foreground": "oklch(0.98 0.005 250)",
      "--primary": "oklch(0.75 0.15 210)",
      "--primary-foreground": "oklch(0.15 0.03 250)",
      "--secondary": "oklch(0.26 0.03 250)",
      "--secondary-foreground": "oklch(0.98 0.005 250)",
      "--muted": "oklch(0.24 0.03 250)",
      "--muted-foreground": "oklch(0.68 0.02 250)",
      "--accent": "oklch(0.30 0.05 220)",
      "--accent-foreground": "oklch(0.98 0.005 250)",
      "--border": "oklch(0.30 0.02 250)",
      "--input": "oklch(0.28 0.02 250)",
      "--ring": "oklch(0.75 0.15 210)",
    },
  },
};

export const DEFAULT_PRESET: ThemePresetKey = "classic";

export function resolvePreset(key: string | null | undefined): ThemePreset {
  if (key && key in THEME_PRESETS) return THEME_PRESETS[key as ThemePresetKey];
  return THEME_PRESETS[DEFAULT_PRESET];
}
