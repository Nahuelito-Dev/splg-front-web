import { usePermiso } from '../../hooks/usePermiso';
import { usePermissions } from '../../hooks/usePermissions';
import { useCompanySupportSummary, usePlatformSupportSummary, type ChatSide } from '../../services/queries/supportChat';

/**
 * De qué lado del chat con la plataforma está quien mira: el admin de la empresa con `soporte.ver`, o el
 * administrador general en la plataforma. En modo soporte o en la empresa propia, ninguno (no se mezclan los lados).
 */
export const useSupportSide = (): ChatSide | null => {
  const { mode } = usePermissions();
  const ver = usePermiso('soporte.ver');
  if (mode === 'platform') return 'platform';
  if (mode === 'company' && ver.allowed) return 'company';
  return null;
};

/** El número de la insignia «Ayuda» / «Chat y tickets»: lo que quien mira tiene sin leer. */
export const useSupportUnread = (side: ChatSide | null): number => {
  const company = useCompanySupportSummary(side === 'company');
  const platform = usePlatformSupportSummary(side === 'platform');
  if (side === 'company') return company.data?.total ?? 0;
  if (side === 'platform') return platform.data?.total ?? 0;
  return 0;
};
