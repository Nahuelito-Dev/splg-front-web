import { useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import type { PurchaseLineToPreviewBody } from '../../services/api/types';
import { usePurchaseTotalPreview } from '../../services/queries/purchases';

/**
 * El total de los renglones que se están cargando, tal como lo calcula el back. Espera a que se deje de tipear;
 * `null` mientras no hay respuesta o si el back rechaza los renglones (la validación del formulario lo explica).
 */
export const usePurchaseTotal = (lines: PurchaseLineToPreviewBody[]): number | null => {
  const key = useDebounce(JSON.stringify(lines), 300);
  const body = useMemo(() => ({ items: JSON.parse(key) as PurchaseLineToPreviewBody[] }), [key]);
  const preview = usePurchaseTotalPreview(body);
  return preview.isError ? null : (preview.data?.total ?? null);
};
