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
