export interface SessionDifference {
  text: string;
  tone: 'neutral' | 'danger' | 'warn' | 'success';
}

/**
 * Cómo se lee la diferencia de un arqueo (contado menos esperado): negativa es faltante, positiva sobrante. Una
 * sesión abierta todavía no tiene arqueo (`null`).
 */
export const sessionDifference = (difference: number | null): SessionDifference => {
  if (difference === null) return { text: '—', tone: 'neutral' };
  if (difference < 0) return { text: 'Faltante', tone: 'danger' };
  if (difference > 0) return { text: 'Sobrante', tone: 'warn' };
  return { text: 'Cuadra', tone: 'success' };
};
