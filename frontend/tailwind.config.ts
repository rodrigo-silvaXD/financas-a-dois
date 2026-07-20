import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--surface-muted) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        "ink-subtle": "rgb(var(--ink-subtle) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-hover": "rgb(var(--brand-hover) / <alpha-value>)",
        "brand-ink": "rgb(var(--brand-ink) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      borderRadius: {
        sm: "8px",       // chips, badges
        md: "12px",
        lg: "16px",      // inputs, botões
        xl: "20px",      // cards (rounded-xl e rounded-2xl agora batem em 20)
        "2xl": "20px",   // alias explícito p/ cards
        "3xl": "24px",   // bottom sheets, modais
      },
      boxShadow: {
        sm: "0 1px 2px rgba(20, 22, 30, 0.05), 0 1px 3px rgba(20, 22, 30, 0.04)",
        md: "0 2px 4px rgba(20, 22, 30, 0.06), 0 4px 12px rgba(20, 22, 30, 0.06)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        hero:    ["48px", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "700" }], // saldo grande estilo Wallet
        greet:   ["30px", { lineHeight: "1.10", letterSpacing: "-0.025em", fontWeight: "700" }], // nome do usuário
        display: ["34px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        title:   ["24px", { lineHeight: "1.20", letterSpacing: "-0.015em", fontWeight: "600" }],
        heading: ["20px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        body:    ["16px", { lineHeight: "1.50", letterSpacing: "-0.005em" }],
        bodysm:  ["14px", { lineHeight: "1.45" }],
        caption: ["12px", { lineHeight: "1.40", fontWeight: "500" }],
        eyebrow: ["11px", { lineHeight: "1.20", letterSpacing: "0.06em", fontWeight: "600" }], // labels tipo SALDO DO MÊS
        button:  ["15px", { lineHeight: "1.20", fontWeight: "600" }],
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",
        "apple-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "180ms",
        base: "220ms",
        slow: "280ms",
      },
    },
  },
  plugins: [],
};
export default config;
