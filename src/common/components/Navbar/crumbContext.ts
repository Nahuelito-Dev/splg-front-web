import { createContext } from 'react';

/** Lo que una ficha le dice a la barra: el nombre de la entidad (en vez de «Detalle») y cómo volver a su lista. */
export interface CrumbOverride {
  label: string;
  /** Vuelve a la lista conservando su búsqueda y filtros (ver `useBackToList`). */
  onBack?: () => void;
}

export interface CrumbContextValue {
  override: CrumbOverride | null;
  setOverride: (override: CrumbOverride | null) => void;
}

export const CrumbContext = createContext<CrumbContextValue>({ override: null, setOverride: () => undefined });
