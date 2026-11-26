import type { ServiceTime } from '../../services/api/types';

/** El valor del campo del formulario (`serviceMinutesMode`, 0 o 1) y lo que se manda al back. */
export const SERVICE_MODE_KEY = 'serviceMinutesMode';
export const serviceModeFromValue = (value: string | undefined): 'fixed' | 'learned' =>
  value === '1' ? 'learned' : 'fixed';

/** «Sugerido: 8 min (42 entregas, 30 días) · Vigente: 10 min», o por qué todavía no hay sugerido. */
export const serviceTimeSummary = (time: ServiceTime): string => {
  const suggested =
    time.suggestedMinutes === null
      ? `Sugerido: todavía sin entregas suficientes (${time.samples} de ${time.minSamples}, ${time.windowDays} días)`
      : `Sugerido: ${time.suggestedMinutes} min (${time.samples} entregas, ${time.windowDays} días)`;
  return `${suggested} · Vigente: ${time.effectiveMinutes} min`;
};
