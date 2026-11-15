import brand from './brand.json';
import type { CompanyTheme, ThemeModeTokens, ThemeTokens } from '../services/api/types';

/** El único formato de color que entra al tema: `#RRGGBB`. Nada de `;`, `url(…)` ni otras declaraciones. */
export const HEX_TOKEN = /^#[0-9A-Fa-f]{6}$/;

export const isHexToken = (value: unknown): value is string => typeof value === 'string' && HEX_TOKEN.test(value);

const { llama, gas, primaryGradient, dark } = brand;

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
