import type { StockBalance } from '../../services/api/types';

export interface StockDelta {
  gasCylinderId: string;
  condition: StockBalance['condition'];
  /** Negativo saca, positivo suma. */
  delta: number;
}

const CONDITION_TEXT: Record<StockBalance['condition'], string> = {
  full: 'llenas',
  empty: 'vacías',
  defective: 'defectuosas',
};

/**
 * El back no deja ningún saldo (ubicación, garrafa, condición) en negativo (409 «stock insuficiente»). Con los saldos
 * de la ubicación de origen devuelve, por índice de renglón, el mensaje de los que sacarían más de lo que hay. Si la
 * misma garrafa y condición está en varios renglones se suman, y el aviso queda en el último de ellos.
 */
export const findShortfalls = (
  balances: readonly StockBalance[],
  deltas: readonly StockDelta[],
): Map<number, string> => {
  const available = new Map<string, number>();
  for (const b of balances) {
    const key = `${b.gasCylinderId}:${b.condition}`;
    available.set(key, (available.get(key) ?? 0) + b.quantity);
  }
  const totals = new Map<string, { sum: number; last: number }>();
  deltas.forEach((d, index) => {
    const key = `${d.gasCylinderId}:${d.condition}`;
    const current = totals.get(key) ?? { sum: 0, last: index };
    totals.set(key, { sum: current.sum + d.delta, last: index });
  });
  const result = new Map<number, string>();
  for (const [key, { sum, last }] of totals) {
    const have = available.get(key) ?? 0;
    if (sum < 0 && have + sum < 0) {
      const condition = deltas[last].condition;
      const type = balances.find((b) => b.gasCylinderId === deltas[last].gasCylinderId)?.gasCylinderType;
      result.set(
        last,
        `Hay ${have} ${CONDITION_TEXT[condition]}${type ? ` de ${type}` : ''}: no se pueden sacar ${-sum}`,
      );
    }
  }
  return result;
};
