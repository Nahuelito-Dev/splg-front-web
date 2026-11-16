import { useCallback, useMemo, useRef } from 'react';
import { newUuid } from '../../../utils/uuid';

/**
 * Un id por intento de envío (`clientMessageId`, `clientBatchId`): reintentar lo mismo reusa el id y la API no lo
 * duplica; si cambió el contenido (el texto, los destinatarios, a quién), es otro envío y lleva otro id.
 */
export const useIntentId = () => {
  const last = useRef<{ signature: string; id: string } | null>(null);
  const idFor = useCallback((signature: string) => {
    if (last.current?.signature !== signature) last.current = { signature, id: newUuid() };
    return last.current.id;
  }, []);
  const reset = useCallback(() => {
    last.current = null;
  }, []);
  return useMemo(() => ({ idFor, reset }), [idFor, reset]);
};
