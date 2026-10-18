import type { CashMovement } from '../../services/api/types';

export type ReverseKind = 'movement' | 'transfer';

/**
 * Qué anulación admite una fila del libro. Sólo los movimientos manuales se
 * anulan sueltos; las patas de una transferencia se anulan juntas; el resto
 * nace de otro documento (rendición, cobro, liquidación, arqueo) y se corrige
 * por su propia pantalla.
 */
export const reverseKindOf = (
  row: Pick<CashMovement, 'referenceType' | 'reversed' | 'reversesMovementId'>,
): ReverseKind | null => {
  if (row.reversed || row.reversesMovementId !== null) return null;
  if (row.referenceType === 'manual') return 'movement';
  if (row.referenceType === 'box_transfer') return 'transfer';
  return null;
};
