import brand from './brand.json';
import type { CompanyTheme, ThemeModeTokens, ThemeTokens } from '../services/api/types';

/** El único formato de color que entra al tema: `#RRGGBB`. Nada de `;`, `url(…)` ni otras declaraciones. */
export const HEX_TOKEN = /^#[0-9A-Fa-f]{6}$/;

export const isHexToken = (value: unknown): value is string => typeof value === 'string' && HEX_TOKEN.test(value);

const { llama, gas, tinta, canvas, sidebar, primaryGradient, dark } = brand;

/** El menú lateral de Brasa: oscuro y el mismo en los dos modos. */
const BRASA_SIDE = {
  side: sidebar.bg,
  sideRaised: sidebar.raised,
  sideLine: sidebar.line,
  sideText: sidebar.text,
  sideMuted: sidebar.muted,
  sideAccent: sidebar.accent,
};

/** Brasa, rol por rol: lo que toma un token que no llegó o no es un color válido. */
export const BRASA_TOKENS: ThemeTokens = {
  light: {
    primary: llama['600'],
    primaryHover: llama['700'],
    primaryStrong: llama['700'],
    primarySoft: llama['50'],
    onPrimary: '#FFFFFF',
    accent: gas['400'],
    accentSoft: gas['50'],
    gradientFrom: primaryGradient.from,
    gradientTo: primaryGradient.to,
    gradientEdge: primaryGradient.border,
    canvas,
    surface: '#FFFFFF',
    surfaceHover: tinta['50'],
    surfaceSunken: tinta['25'],
    surfaceMuted: tinta['100'],
    outline: tinta['200'],
    outlineSoft: tinta['100'],
    ...BRASA_SIDE,
  },
  dark: {
    primary: llama['600'],
    primaryHover: llama['700'],
    primaryStrong: dark.primaryStrong,
    primarySoft: dark.primarySoft,
    onPrimary: '#FFFFFF',
    accent: gas['400'],
    accentSoft: dark.accentSoft,
    gradientFrom: primaryGradient.from,
    gradientTo: primaryGradient.to,
    gradientEdge: primaryGradient.border,
    canvas: dark.canvas,
    surface: dark.surface,
    surfaceHover: dark.surfaceHover,
    surfaceSunken: dark.surfaceSunken,
    surfaceMuted: dark.surfaceMuted,
    outline: dark.outline,
    outlineSoft: dark.outlineSoft,
    ...BRASA_SIDE,
  },
};

const ROLES = Object.keys(BRASA_TOKENS.light) as Array<keyof ThemeModeTokens>;

const sanitizeMode = (raw: unknown, fallback: ThemeModeTokens): ThemeModeTokens => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    ROLES.map((role) => [role, isHexToken(source[role]) ? source[role] : fallback[role]]),
  ) as unknown as ThemeModeTokens;
};

/**
 * Valida los tokens una sola vez, al recibirlos de la API: cada rol que no sea un `#RRGGBB` toma el de Brasa. Así
 * ningún valor de la API llega sin validar a MUI, a un `linear-gradient` ni a la hoja de estilos.
 */
export const sanitizeTokens = (raw: unknown): ThemeTokens => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return { light: sanitizeMode(source.light, BRASA_TOKENS.light), dark: sanitizeMode(source.dark, BRASA_TOKENS.dark) };
};

/** El tema de la API con los tokens ya validados. */
export const sanitizeCompanyTheme = (theme: CompanyTheme): CompanyTheme => ({
  ...theme,
  tokens: sanitizeTokens(theme.tokens),
});
