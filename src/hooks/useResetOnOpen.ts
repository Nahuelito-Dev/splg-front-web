import { useEffect, useRef } from 'react';

/**
 * Carga los valores del formulario sólo al abrirse el modal. Si el dato de origen se refresca con el modal abierto
 * (un refetch), lo que la persona ya escribió no se pisa.
 */
export const useResetOnOpen = (open: boolean, reset: () => void) => {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) reset();
    wasOpen.current = open;
  }, [open, reset]);
};
