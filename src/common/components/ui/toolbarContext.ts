import { createContext, useContext } from 'react';

/**
 * `true` dentro de los filtros de `TableToolbar`: los controles del kit (`Select`, `Checkbox`, el filtro de fechas) se
 * dibujan en su versión de barra, de 40 px, sin etiqueta visible (va en `aria-label`) y alineados en una fila.
 */
export const ToolbarContext = createContext(false);

export const useInToolbar = () => useContext(ToolbarContext);
