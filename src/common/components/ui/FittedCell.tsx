import type { ReactNode } from 'react';

/**
 * Celda dibujada a mano: no se sale de su columna y el texto cortado termina en «…». El tooltip, sólo si la columna
 * declara su texto (`tooltip`); las celdas de texto plano ya muestran su valor formateado.
 */
export const FittedCell = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="min-w-0 max-w-full truncate [&_.block]:truncate" title={title}>
    {children}
  </div>
);
