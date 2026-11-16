const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

const STEPS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'day', ms: 86_400_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'minute', ms: 60_000 },
];

/** "hace 5 minutos", "hace 2 horas", "ayer", "dentro de 3 días": la hora de un evento respecto de `now`. */
export const formatRelative = (at: number, now: number): string => {
  const diff = at - now;
  for (const { unit, ms } of STEPS) {
    if (Math.abs(diff) >= ms) return relative.format(Math.trunc(diff / ms), unit);
  }
  return 'hace instantes';
};
