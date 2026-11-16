import { useContext, useEffect, useRef } from 'react';
import { CrumbContext, type CrumbOverride } from './crumbContext';

export const useCrumbOverride = (): CrumbOverride | null => useContext(CrumbContext).override;

/**
 * Una ficha publica en la barra superior el nombre de su entidad como última miga. Sin nombre
 * (cargando, error) la barra deja la que deriva de la URL. Se limpia al salir de la ficha.
 */
export const useCrumbLeaf = (label: string | null | undefined, onBack?: () => void): void => {
  const { setOverride } = useContext(CrumbContext);
  // `onBack` puede cambiar de identidad en cada render: se lee de una ref para no republicar la miga en bucle.
  const latestBack = useRef(onBack);
  latestBack.current = onBack;
  const hasBack = Boolean(onBack);
  useEffect(() => {
    setOverride(label ? { label, onBack: hasBack ? () => latestBack.current?.() : undefined } : null);
    return () => setOverride(null);
  }, [label, hasBack, setOverride]);
};
