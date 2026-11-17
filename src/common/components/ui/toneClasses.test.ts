import { describe, expect, it } from 'vitest';
import brand from '../../../theme/brand.json';
import { companyThemeCss } from '../../../theme/companyTheme';
import { BRASA_TOKENS } from '../../../theme/themeTokens';
import type { Tone } from '../../../utils/statusLabels';
import { TONE_CLASSES } from './toneClasses';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const { status, statusSoft, dark, tinta, llama, gas } = brand;

/** Cada tono suave: las clases que usa y el par (fondo, texto) que resultan en cada tema (ver tailwind.config.js). */
const SPEC: Record<Tone, { classes: string; light: [string, string]; dark: [string, string] }> = {
  neutral: {
    classes: 'bg-surface-muted text-ink-2',
    light: [tinta[100], tinta[700]],
    dark: [dark.surfaceMuted, dark.ink2],
  },
  info: {
    classes: 'bg-info-soft text-info',
    light: [statusSoft.info, status.info],
    dark: [dark.statusSoft.info, dark.status.info],
  },
  warn: {
    classes: 'bg-warn-soft text-warn',
    light: [statusSoft.warn, status.warn],
    dark: [dark.statusSoft.warn, dark.status.warn],
  },
  success: {
    classes: 'bg-success-soft text-success',
    light: [statusSoft.success, status.success],
    dark: [dark.statusSoft.success, dark.status.success],
  },
  danger: {
    classes: 'bg-danger-soft text-danger',
    light: [statusSoft.danger, status.danger],
    dark: [dark.statusSoft.danger, dark.status.danger],
  },
  primary: {
    classes: 'bg-primary-soft text-on-primary-soft',
    light: [llama[50], llama[700]],
    dark: [dark.primarySoft, dark.primaryStrong],
  },
  accent: {
    classes: 'bg-accent-soft text-on-accent-soft',
    light: [gas[50], tinta[900]],
    dark: [dark.accentSoft, dark.ink],
  },
};

describe('Tonos suaves: contraste', () => {
  it.each(Object.keys(SPEC) as Tone[])('«%s» usa los colores esperados y llega a 4,5:1 en claro y oscuro', (tone) => {
    expect(TONE_CLASSES[tone]).toBe(SPEC[tone].classes);
    for (const theme of ['light', 'dark'] as const) {
      const [bg, fg] = SPEC[tone][theme];
      expect(contrast(bg, fg), `${tone} ${theme}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Tonos suaves con el tema de una empresa', () => {
  const cssVar = (css: string, mode: 'light' | 'dark', name: string) => {
    const rule = css.split('\n')[mode === 'light' ? 0 : 1];
    const channels = new RegExp(`--c-${name}: (\\d+) (\\d+) (\\d+);`).exec(rule);
    if (!channels) throw new Error(`falta --c-${name}`);
    return `#${channels
      .slice(1)
      .map((c) => Number(c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  };

  it('«accent» y «primary» usan el texto que calcula el tema, no un color fijo', () => {
    expect(TONE_CLASSES.accent).toBe('bg-accent-soft text-on-accent-soft');
    expect(TONE_CLASSES.primary).toBe('bg-primary-soft text-on-primary-soft');
  });

  it('un acento claro en modo oscuro: el texto deja la tinta clara del modo y llega a 4,5:1', () => {
    const tokens = {
      light: { ...BRASA_TOKENS.light, accentSoft: '#FFF7D6' },
      dark: { ...BRASA_TOKENS.dark, accentSoft: '#F5E6A8' },
    };
    const css = companyThemeCss(tokens);
    // Con la tinta clara de oscuro no llega: cae a la que sí.
    expect(contrast(dark.ink, '#F5E6A8')).toBeLessThan(4.5);
    expect(contrast(cssVar(css, 'dark', 'on-accent-soft'), '#F5E6A8')).toBeGreaterThanOrEqual(4.5);
    expect(cssVar(css, 'light', 'on-accent-soft')).toBe(tinta[900]);
  });

  it('un fuerte que no contrasta con su suave cae a la tinta del modo; uno que sí, se respeta', () => {
    const tokens = {
      light: { ...BRASA_TOKENS.light, primarySoft: '#FFE4D6', primaryStrong: '#F4A27A' },
      dark: { ...BRASA_TOKENS.dark, primarySoft: '#3A1E10', primaryStrong: '#FFB48F' },
    };
    const css = companyThemeCss(tokens);
    expect(contrast('#F4A27A', '#FFE4D6')).toBeLessThan(4.5);
    expect(cssVar(css, 'light', 'on-primary-soft')).toBe(tinta[900]);
    expect(cssVar(css, 'dark', 'on-primary-soft')).toBe('#FFB48F');
    expect(contrast(cssVar(css, 'dark', 'on-primary-soft'), '#3A1E10')).toBeGreaterThanOrEqual(4.5);
  });
});
