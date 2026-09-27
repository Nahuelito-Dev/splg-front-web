import { createRequire } from 'node:module';

/**
 * Sistema visual «Brasa» (splg-docs/material-de-trabajo/MARCA.md). Los valores
 * viven en src/theme/brand.json, que también leen el tema de MUI y los gráficos.
 * Los componentes usan roles (primary, ink, muted, outline…); las escalas
 * llama, gas y tinta quedan para matices. `npm run colors` impide las paletas
 * sueltas de Tailwind (indigo, rose, slate…).
 */
const brand = createRequire(import.meta.url)('./src/theme/brand.json');
const { llama, gas, tinta, canvas, sidebar, status, statusSoft, primaryGradient } = brand;
const state = (name) => ({ DEFAULT: status[name], soft: statusSoft[name] });

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        llama,
        gas,
        tinta,
        primary: {
          DEFAULT: llama[600],
          hover: llama[700],
          strong: llama[700],
          soft: llama[50],
          from: primaryGradient.from,
          to: primaryGradient.to,
          edge: primaryGradient.border,
        },
        'on-primary': '#FFFFFF',
        accent: { DEFAULT: gas[400], soft: gas[50] },
        'on-accent': tinta[900],
        ink: tinta[900],
        'ink-2': tinta[700],
        muted: tinta[500],
        faint: tinta[400],
        outline: tinta[200],
        'outline-soft': tinta[100],
        bg: canvas,
        surface: '#FFFFFF',
        side: { DEFAULT: sidebar.bg, raised: sidebar.raised, line: sidebar.line, text: sidebar.text },
        success: state('success'),
        danger: state('danger'),
        warn: state('warn'),
        info: state('info'),
      },
      fontFamily: {
        sans: ['Geist', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Geist', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        control: '0 1px 2px rgba(16, 24, 40, 0.05)',
        primary:
          'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 1px 2px rgba(16, 24, 40, 0.12), 0 6px 14px -6px rgba(217, 83, 14, 0.55)',
        mark: '0 6px 16px -6px rgba(242, 107, 29, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
