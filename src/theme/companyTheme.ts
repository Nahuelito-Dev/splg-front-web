import type { ThemeModeTokens, ThemeTokens } from '../services/api/types';
import { isHexToken } from './themeTokens';
import brand from './brand.json';
import { onColor, readableOn } from './colorContrast';

/**
 * Tema de la distribuidora del contexto (company, support, owned): marca, menú lateral y superficies (las oscuras y el
 * menú en el tono de su principal; el contraste lo garantiza el back). Los colores de una empresa entran como **datos**
 * (los tokens que calcula y valida el back, `GET /v2/company/theme`, revalidados al recibirlos con `sanitizeTokens`) y sólo acá, dentro de `src/theme`: los componentes
 * siguen usando roles (`bg-primary`, `text-on-primary`…), que son variables CSS (`tailwind.config.js`).
 *
 * Se aplican con una hoja `<style>` que pisa las variables de `:root` y `.dark` (una regla por modo, así el cambio de
 * claro a oscuro no necesita volver a aplicar nada). Sin tema (plataforma, login, empresa con el tema por omisión) la
 * hoja no existe y rigen las variables de Brasa. Aplicar y limpiar es sincrónico: quien cambia de contexto limpia en el
 * mismo paso, sin un cuadro con los colores de otra empresa.
 */

const STYLE_ID = 'splg-tema-empresa';

/** Token del back → variable CSS del rol (`tailwind.config.js`). */
const VARIABLES: Record<keyof ThemeModeTokens, string> = {
  primary: 'primary',
  primaryHover: 'primary-hover',
  primaryStrong: 'primary-strong',
  primarySoft: 'primary-soft',
  onPrimary: 'on-primary',
  accent: 'accent',
  accentSoft: 'accent-soft',
  gradientFrom: 'primary-from',
  gradientTo: 'primary-to',
  gradientEdge: 'primary-edge',
  canvas: 'bg',
  surface: 'surface',
  surfaceHover: 'surface-hover',
  surfaceSunken: 'surface-sunken',
  surfaceMuted: 'surface-muted',
  outline: 'outline',
  outlineSoft: 'outline-soft',
  side: 'side',
  sideRaised: 'side-raised',
  sideLine: 'side-line',
  sideText: 'side-text',
  sideMuted: 'side-muted',
  sideAccent: 'side-accent',
};

/** '#RRGGBB' → 'R G B' (canales para `rgb(var(--c-x) / <alpha-value>)`), o `null` si no es un color. */
export const hexToChannels = (hex: string): string | null => {
  if (!isHexToken(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** La tinta de cada modo (no la pisa la empresa). */
const INK = { light: brand.tinta['900'], dark: brand.dark.ink } as const;

const declarations = (tokens: ThemeModeTokens, mode: keyof typeof INK): string =>
  (Object.keys(VARIABLES) as Array<keyof ThemeModeTokens>)
    .map((key) => {
      const channels = hexToChannels(tokens[key]);
      return channels ? `--c-${VARIABLES[key]}: ${channels};` : '';
    })
    .concat(`--c-on-accent: ${hexToChannels(onColor(tokens.accent))};`)
    // Texto de los tonos suaves de la marca (`Badge`, contadores): el fuerte de la empresa si llega a 4,5:1 sobre su
    // suave; si no, la tinta del modo (un acento claro en oscuro no deja el texto ilegible).
    .concat(
      `--c-on-primary-soft: ${hexToChannels(readableOn(tokens.primarySoft, tokens.primaryStrong, INK[mode]))};`,
      `--c-on-accent-soft: ${hexToChannels(readableOn(tokens.accentSoft, INK[mode], INK[mode]))};`,
    )
    .join(' ');

/** La hoja de estilos de un tema: `:root:root` le gana a la base de Tailwind sin `!important`. */
export const companyThemeCss = (tokens: ThemeTokens): string =>
  `:root:root { ${declarations(tokens.light, 'light')} }\n:root:root.dark { ${declarations(tokens.dark, 'dark')} }`;

type Listener = () => void;
const listeners = new Set<Listener>();
let current: ThemeTokens | null = null;

const notify = () => listeners.forEach((listener) => listener());

/** Aplica los tokens de la empresa (o limpia con `null`). Idempotente: el mismo tema no vuelve a tocar el DOM. */
export const applyCompanyTheme = (tokens: ThemeTokens | null) => {
  const css = tokens ? companyThemeCss(tokens) : null;
  const existing = document.getElementById(STYLE_ID);
  if (css === null) {
    existing?.remove();
  } else if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
  } else {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
  const changed = css !== (current ? companyThemeCss(current) : null);
  current = tokens;
  if (changed) notify();
};

/** Vuelve a Brasa: al salir de la empresa propia, al cortar el soporte, al cerrar sesión. */
export const clearCompanyTheme = () => applyCompanyTheme(null);

/** Para `useSyncExternalStore` (el tema de MUI sigue a los mismos tokens). */
export const companyThemeStore = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): ThemeTokens | null => current,
};
