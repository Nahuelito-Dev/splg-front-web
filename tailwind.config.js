import { createRequire } from 'node:module';
import plugin from 'tailwindcss/plugin.js';

/**
 * Sistema visual «Brasa» (splg-docs/material-de-trabajo/MARCA.md). Los valores
 * viven en src/theme/brand.json, que también leen el tema de MUI y los gráficos.
 * Los componentes usan roles (primary, ink, muted, outline…); las escalas
 * llama, gas y tinta quedan para matices. `npm run colors` impide las paletas
 * sueltas de Tailwind (indigo, rose, slate…).
 *
 * Modo oscuro: los roles que dependen del fondo (ink, muted, outline, bg,
 * surface, los "soft" de estado…) viven en variables CSS (`:root` / `.dark`,
 * inyectadas más abajo) para poder cambiar de valor sin cambiar de clase.
 * Las escalas (`llama`, `gas`, `tinta`) y el menú lateral (`side`) quedan
 * fijos: el menú ya es oscuro en los dos temas.
 *
 * Tema por distribuidora: los roles de marca (`primary`, sus variantes y el
 * gradiente, `on-primary`, `accent`) también son variables. Acá llevan Brasa
 * (la plataforma y la empresa sin tema propio); en el contexto de una empresa
 * con tema, `src/theme/companyTheme.ts` las pisa con los tokens de la API.
 */
const brand = createRequire(import.meta.url)('./src/theme/brand.json');
const { llama, gas, tinta, canvas, sidebar, status, statusSoft, primaryGradient, dark } = brand;

/** '#RRGGBB' → '12 15 22' (canal R G B), para rgb(var(--x) / <alpha-value>). */
const channels = (hex) => {
  const n = hex.replace('#', '');
  const full =
    n.length === 3
      ? n
          .split('')
          .map((c) => c + c)
          .join('')
      : n;
  const int = parseInt(full, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
};

/** Variable CSS reactiva al tema: valor claro en :root, oscuro en .dark. */
const themed = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** Los roles de marca con Brasa: iguales en claro y oscuro salvo los suaves y el fuerte. */
const BRAND_VARS = {
  primary: llama['600'],
  'primary-hover': llama['700'],
  'primary-from': primaryGradient.from,
  'primary-to': primaryGradient.to,
  'primary-edge': primaryGradient.border,
  'on-primary': '#FFFFFF',
  accent: gas['400'],
};

const LIGHT_VARS = {
  ...BRAND_VARS,
  bg: canvas,
  surface: '#FFFFFF',
  'surface-hover': tinta['50'],
  'surface-sunken': tinta['25'],
  'surface-muted': tinta['100'],
  ink: tinta['900'],
  'ink-2': tinta['700'],
  muted: tinta['500'],
  faint: tinta['400'],
  outline: tinta['200'],
  'outline-soft': tinta['100'],
  'primary-soft': llama['50'],
  'primary-strong': llama['700'],
  'accent-soft': gas['50'],
  'on-accent': tinta['900'],
  success: status.success,
  'success-soft': statusSoft.success,
  danger: status.danger,
  'danger-soft': statusSoft.danger,
  warn: status.warn,
  'warn-soft': statusSoft.warn,
  info: status.info,
  'info-soft': statusSoft.info,
};

const DARK_VARS = {
  ...BRAND_VARS,
  bg: dark.canvas,
  surface: dark.surface,
  'surface-hover': dark.surfaceHover,
  'surface-sunken': dark.surfaceSunken,
  'surface-muted': dark.surfaceMuted,
  ink: dark.ink,
  'ink-2': dark.ink2,
  muted: dark.muted,
  faint: dark.faint,
  outline: dark.outline,
  'outline-soft': dark.outlineSoft,
  'primary-soft': dark.primarySoft,
  'primary-strong': dark.primaryStrong,
  'accent-soft': dark.accentSoft,
  'on-accent': dark.onAccent,
  success: dark.status.success,
  'success-soft': dark.statusSoft.success,
  danger: dark.status.danger,
  'danger-soft': dark.statusSoft.danger,
  warn: dark.status.warn,
  'warn-soft': dark.statusSoft.warn,
  info: dark.status.info,
  'info-soft': dark.statusSoft.info,
};

const asCssVars = (vars) => Object.fromEntries(Object.entries(vars).map(([key, hex]) => [`--c-${key}`, channels(hex)]));

const brandVariables = plugin(({ addBase }) => {
  addBase({
    ':root': asCssVars(LIGHT_VARS),
    '.dark': asCssVars(DARK_VARS),
  });
});

/** Variante para dispositivos con puntero fino y hover real (no táctiles): `pointer-hover:`. */
const pointerHover = plugin(({ addVariant }) => {
  addVariant('pointer-hover', '@media (hover: hover) and (pointer: fine)');
});

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        llama,
        gas,
        tinta,
        primary: {
          DEFAULT: themed('primary'),
          hover: themed('primary-hover'),
          strong: themed('primary-strong'),
          soft: themed('primary-soft'),
          from: themed('primary-from'),
          to: themed('primary-to'),
          edge: themed('primary-edge'),
        },
        'on-primary': themed('on-primary'),
        accent: { DEFAULT: themed('accent'), soft: themed('accent-soft') },
        'on-accent': themed('on-accent'),
        ink: themed('ink'),
        'ink-2': themed('ink-2'),
        muted: themed('muted'),
        faint: themed('faint'),
        outline: themed('outline'),
        'outline-soft': themed('outline-soft'),
        bg: themed('bg'),
        surface: themed('surface'),
        'surface-hover': themed('surface-hover'),
        'surface-sunken': themed('surface-sunken'),
        'surface-muted': themed('surface-muted'),
        side: { DEFAULT: sidebar.bg, raised: sidebar.raised, line: sidebar.line, text: sidebar.text },
        success: { DEFAULT: themed('success'), soft: themed('success-soft') },
        danger: { DEFAULT: themed('danger'), soft: themed('danger-soft') },
        warn: { DEFAULT: themed('warn'), soft: themed('warn-soft') },
        info: { DEFAULT: themed('info'), soft: themed('info-soft') },
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
  plugins: [brandVariables, pointerHover],
};
