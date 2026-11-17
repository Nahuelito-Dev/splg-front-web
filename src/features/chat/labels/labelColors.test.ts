import { describe, expect, it } from 'vitest';
import brand from '../../../theme/brand.json';
import { contrast } from '../../../theme/colorContrast';
import { CHAT_LABEL_COLORS } from '../../../services/api/chatLabels';
import { LABEL_COLORS, labelColorClasses } from './labelColors';

const { status, statusSoft, dark, tinta, llama } = brand;

/** Lo que resulta de las clases de cada color en cada tema (ver tailwind.config.js): [fondo, texto]. */
const PAIRS: Record<string, { light: [string, string]; dark: [string, string] }> = {
  'bg-surface-muted text-ink-2': { light: [tinta[100], tinta[700]], dark: [dark.surfaceMuted, dark.ink2] },
  'bg-danger-soft text-danger': {
    light: [statusSoft.danger, status.danger],
    dark: [dark.statusSoft.danger, dark.status.danger],
  },
  'bg-primary-soft text-on-primary-soft': {
    light: [llama[50], llama[700]],
    dark: [dark.primarySoft, dark.primaryStrong],
  },
  'bg-warn-soft text-warn': { light: [statusSoft.warn, status.warn], dark: [dark.statusSoft.warn, dark.status.warn] },
  'bg-success-soft text-success': {
    light: [statusSoft.success, status.success],
    dark: [dark.statusSoft.success, dark.status.success],
  },
  'bg-success text-surface': { light: [status.success, '#FFFFFF'], dark: [dark.status.success, dark.surface] },
  'bg-info-soft text-info': { light: [statusSoft.info, status.info], dark: [dark.statusSoft.info, dark.status.info] },
  'bg-info text-surface': { light: [status.info, '#FFFFFF'], dark: [dark.status.info, dark.surface] },
  'bg-ink text-surface': { light: [tinta[900], '#FFFFFF'], dark: [dark.ink, dark.surface] },
  'bg-danger text-surface': { light: [status.danger, '#FFFFFF'], dark: [dark.status.danger, dark.surface] },
};

/** Las clases de relleno y texto (sin el borde). */
const fill = (color: (typeof CHAT_LABEL_COLORS)[number]) =>
  LABEL_COLORS[color].classes
    .split(' ')
    .filter((c) => !c.startsWith('border-'))
    .join(' ');
const SURFACE = { light: '#FFFFFF', dark: dark.surface };

describe('colores de las etiquetas', () => {
  it.each(CHAT_LABEL_COLORS)('%s se separa de la superficie (3:1) en claro y en oscuro', (color) => {
    const pair = PAIRS[fill(color)];
    const soft = LABEL_COLORS[color].classes.includes('border-current');
    // Las suaves se separan por el borde (el color del texto); las llenas, por el relleno.
    const edge = (theme: 'light' | 'dark') => (soft ? pair[theme][1] : pair[theme][0]);
    expect(soft || LABEL_COLORS[color].classes.includes('border-transparent')).toBe(true);
    expect(contrast(edge('light'), SURFACE.light)).toBeGreaterThanOrEqual(3);
    expect(contrast(edge('dark'), SURFACE.dark)).toBeGreaterThanOrEqual(3);
  });

  it('las diez claves de la API tienen su color, y todos se distinguen', () => {
    expect(Object.keys(LABEL_COLORS).sort()).toEqual([...CHAT_LABEL_COLORS].sort());
    const classes = CHAT_LABEL_COLORS.map((color) => LABEL_COLORS[color].classes);
    expect(new Set(classes).size).toBe(CHAT_LABEL_COLORS.length);
  });

  it.each(CHAT_LABEL_COLORS)('%s llega a 4,5:1 en claro y en oscuro', (color) => {
    const pair = PAIRS[fill(color)];
    expect(pair).toBeDefined();
    expect(contrast(...pair.light)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(...pair.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it('un color que el panel no conoce se pinta gris', () => {
    expect(labelColorClasses('cyan')).toBe(LABEL_COLORS.gray.classes);
  });
});
