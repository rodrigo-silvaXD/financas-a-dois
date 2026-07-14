/**
 * Design tokens — Finanças a Dois
 * Referências: Apple Wallet, Apple Health, Notas do iPhone, Oura, Revolut, Monzo.
 * Regras: sem #FFFFFF puro, sem #000000 puro, mobile-first, cantos generosos, sombras discretas.
 */

export const colors = {
  light: {
    canvas: "#F8F9FA",        // fundo do app
    surface: "#FDFDFD",       // cards / superfície elevada
    surfaceMuted: "#F1F2F5",  // pill, chip, campo desabilitado
    ink: "#1A1A2E",           // texto principal
    inkMuted: "#5B5B72",      // texto secundário
    inkSubtle: "#8A8FA0",     // texto terciário / placeholder
    hairline: "#E6E7EB",      // divisores 1px

    brand: "#4C5FA8",         // primário — indigo/navy desaturado, calmo
    brandHover: "#3E4F92",
    brandInk: "#FDFDFD",      // texto sobre brand

    accent: "#F97066",        // coral — usado com muita parcimônia (badge casal)

    success: "#10B981",       // entradas / positivo
    warning: "#F59E0B",       // limite próximo
    danger:  "#EF4444",       // saídas / negativo (uso comedido)
  },
  dark: {
    canvas: "#0F1117",        // dark confortável, não OLED cru
    surface: "#171A22",
    surfaceMuted: "#212430",
    ink: "#E8EAED",
    inkMuted: "#A0A4B0",
    inkSubtle: "#6B6F7C",
    hairline: "#2A2D38",

    brand: "#8A97D4",         // lavanda navy — legível no dark sem ser vibrante
    brandHover: "#A2AEE0",
    brandInk: "#0F1117",

    accent: "#FB8A80",

    success: "#34D399",
    warning: "#FBBF24",
    danger:  "#F87171",
  },
} as const;

export const radius = {
  sm: "8px",       // chips, badges
  md: "12px",
  lg: "16px",      // botões, inputs
  xl: "20px",      // cards
  "2xl": "20px",   // alias
  "3xl": "24px",   // bottom sheets, modais
  pill: "9999px",
} as const;

export const spacing = {
  xxs: "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

export const shadows = {
  none: "none",
  sm: "0 1px 2px rgba(20, 22, 30, 0.05), 0 1px 3px rgba(20, 22, 30, 0.04)",
  md: "0 2px 4px rgba(20, 22, 30, 0.06), 0 4px 12px rgba(20, 22, 30, 0.06)",
} as const;

export const motion = {
  // easing tipo Apple — natural, sem overshoot
  ease: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  fast: "180ms",
  base: "220ms",
  slow: "280ms",
} as const;

export const typography = {
  // Base 16px, mobile-first, Inter como stand-in do SF.
  fontFamily: {
    sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
    mono: `ui-monospace, 'SF Mono', Menlo, monospace`,
  },
  scale: {
    display: { size: "34px", lh: "1.15", tracking: "-0.02em", weight: 700 }, // saldos grandes
    title:   { size: "24px", lh: "1.20", tracking: "-0.015em", weight: 600 },
    heading: { size: "20px", lh: "1.25", tracking: "-0.01em", weight: 600 },
    body:    { size: "16px", lh: "1.50", tracking: "-0.005em", weight: 400 },
    bodySm:  { size: "14px", lh: "1.45", tracking: "0", weight: 400 },
    caption: { size: "12px", lh: "1.40", tracking: "0", weight: 500 },
    button:  { size: "15px", lh: "1.20", tracking: "0", weight: 600 },
  },
} as const;
