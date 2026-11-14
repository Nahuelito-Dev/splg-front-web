import { useAppSelector } from '../../hooks/reduxHooks';
import { useOwnedCompany } from '../../hooks/useOwnedCompany';
import { useSupportSession } from '../../hooks/useSupportSession';
import { store } from '../../store/store';
import { ownedCompany } from '../api/ownedCompany';
import { supportMode } from '../api/supportMode';

interface ContextInput {
  role: string | null;
  uid: string | null;
  /** Id de la sesión de soporte activa. */
  supportId: string | null;
  /** Id de la empresa propia que opera el administrador general. */
  ownedId: string | null;
}

/**
 * La identidad de la empresa que se mira, para las claves de lo que es de una empresa (el tema): el admin (su empresa
 * es la de su perfil, fija para su cuenta), la sesión de soporte o la empresa propia. `null` en la plataforma o sin
 * sesión: ahí no hay empresa.
 */
export const companyContextOf = ({ role, uid, supportId, ownedId }: ContextInput): string | null => {
  if (!uid) return null;
  if (role === 'admin') return `company:${uid}`;
  if (role !== 'super_admin') return null;
  if (supportId) return `support:${supportId}`;
  if (ownedId) return `owned:${ownedId}`;
  return null;
};

/** El contexto de este momento, fuera de React (para comparar al terminar una mutación). */
export const currentCompanyContext = (): string | null => {
  const { role, uid } = store.getState().auth;
  return companyContextOf({
    role,
    uid,
    supportId: supportMode.activeId(),
    ownedId: ownedCompany.getFor(uid)?.id ?? null,
  });
};

/** El mismo contexto, reactivo. */
export const useCompanyContext = (): string | null => {
  const role = useAppSelector((state) => state.auth.role);
  const uid = useAppSelector((state) => state.auth.uid);
  const { active } = useSupportSession();
  const owned = useOwnedCompany();
  return companyContextOf({ role, uid, supportId: active?.id ?? null, ownedId: owned?.id ?? null });
};
