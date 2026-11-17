export const days = (n: number): string =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${Math.abs(n) === 1 ? 'día' : 'días'}`;

/** Una frase que dice si la fecha proyectada tiende a quedar corta o larga. */
export const tendencyText = (bias: number | null, subject: string): string => {
  if (bias === null) return '–';
  if (Math.abs(bias) < 0.5) return 'Sin una tendencia marcada: acierta para los dos lados.';
  return bias > 0
    ? `Tiende a atrasarse: ${subject} en promedio ${days(bias)} después de lo estimado.`
    : `Tiende a adelantarse: ${subject} en promedio ${days(-bias)} antes de lo estimado.`;
};
