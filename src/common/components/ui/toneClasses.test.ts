import { describe, expect, it } from 'vitest';
import brand from '../../../theme/brand.json';
import { onColor } from '../../../theme/colorContrast';
import { BRASA_TOKENS } from '../../../theme/themeTokens';
import { companyThemeCss } from '../../../theme/companyTheme';
import type { Tone } from '../../../utils/statusLabels';
import { TONE_FILLED_CLASSES } from './toneClasses';

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

const { status, dark, tinta, gas, canvas, primaryGradient } = brand;

/** Cada tono lleno: las clases que usa y el par (fondo, texto) que resultan en cada tema. */
const SPEC: Record<Tone, { classes: string; light: [string, string]; dark: [string, string] }> = {
  neutral: { classes: 'bg-ink-2 text-bg', light: [tinta[700], canvas], dark: [dark.ink2, dark.canvas] },
  info: { classes: 'bg-info text-bg', light: [status.info, canvas], dark: [dark.status.info, dark.canvas] },
  warn: { classes: 'bg-warn text-bg', light: [status.warn, canvas], dark: [dark.status.warn, dark.canvas] },
  success: {
    classes: 'bg-success text-bg',
    light: [status.success, canvas],
    dark: [dark.status.success, dark.canvas],
  },
  danger: { classes: 'bg-danger text-bg', light: [status.danger, canvas], dark: [dark.status.danger, dark.canvas] },
  primary: {
    classes: 'bg-primary-to text-on-primary',
    light: [primaryGradient.to, '#FFFFFF'],
    dark: [primaryGradient.to, '#FFFFFF'],
  },
  accent: { classes: 'bg-accent text-on-accent', light: [gas[400], tinta[900]], dark: [gas[400], tinta[900]] },
};

describe('Badge lleno: contraste', () => {
  it.each(Object.keys(SPEC) as Tone[])('«%s» usa los colores esperados y llega a 4,5:1 en claro y oscuro', (tone) => {
    expect(TONE_FILLED_CLASSES[tone]).toBe(SPEC[tone].classes);
    for (const theme of ['light', 'dark'] as const) {
      const [bg, fg] = SPEC[tone][theme];
      expect(contrast(bg, fg), `${tone} ${theme}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('«accent» usa los roles que entrega el tema activo con un texto calculado', () => {
    expect(TONE_FILLED_CLASSES.accent).toBe('bg-accent text-on-accent');
    const tokens = {
      light: { ...BRASA_TOKENS.light, accent: '#A87900' },
      dark: { ...BRASA_TOKENS.dark, accent: '#A87900' },
    };
    expect(onColor(tokens.light.accent)).toBe('#0B1220');
    expect(companyThemeCss(tokens)).toContain('--c-on-accent: 11 18 32;');
  });
});
