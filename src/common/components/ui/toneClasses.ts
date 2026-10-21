import type { Tone } from '../../../utils/statusLabels';

/** Clases de cada tono; las reusan las pestañas con contador. */
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-2',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary-strong',
  accent: 'bg-accent-soft text-on-accent',
};

/** Variante llena de cada tono (estados críticos): fondo del tono y texto con el color de la superficie. Cada par llega a 4,5:1 en los dos temas (lo controla toneClasses.test.ts). */
export const TONE_FILLED_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink-2 text-bg',
  info: 'bg-info text-bg',
  warn: 'bg-warn text-bg',
  success: 'bg-success text-bg',
  danger: 'bg-danger text-bg',
  primary: 'bg-primary-to text-on-primary',
  accent: 'bg-gas-400 text-tinta-900',
};

/** Color de texto/trazo de cada tono (anillos y marcas que se pintan con `currentColor`). */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-faint',
  info: 'text-info',
  warn: 'text-warn',
  success: 'text-success',
  danger: 'text-danger',
  primary: 'text-primary',
  accent: 'text-accent',
};
