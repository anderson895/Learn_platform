/**
 * Mga kulay at font na kinuha sa reference UI (Figs. 7-15 ng PDF).
 * Walang "use client" dito, kaya puwede itong gamitin sa Server at Client Components.
 */
export const brand = {
  navy: "#0F1B2D", // sidebar, video panel, login panel
  navyBorder: "#1E2B40",
  sky: "#0EA5E9", // primary
  ink: "#0F172A", // dark buttons
  muted: "#94A3B8",
} as const;

export const monoFont = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';
export const sansFont = 'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif';
