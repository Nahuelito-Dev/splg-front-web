import { useMemo, useSyncExternalStore } from 'react';
import { ownedCompany, type OwnedCompany } from '../services/api/ownedCompany';
import { useAppSelector } from './reduxHooks';

/**
 * La empresa propia que opera el administrador general logueado, o `null` (ver `services/api/ownedCompany`). Una
 * elegida por otra cuenta en el mismo navegador no cuenta.
 */
export const useOwnedCompany = (): OwnedCompany | null => {
  const stored = useSyncExternalStore(ownedCompany.subscribe, ownedCompany.getStored);
  const uid = useAppSelector((state) => state.auth.uid);
  return useMemo(
    () => (stored && uid && stored.ownerUid === uid ? { id: stored.id, slug: stored.slug, name: stored.name } : null),
    [stored, uid],
  );
};
