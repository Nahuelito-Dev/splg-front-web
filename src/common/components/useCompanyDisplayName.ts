import { usePermissions } from '../../hooks';
import { useCompanyTheme } from '../../services/queries/companyTheme';
import { useCurrentDistributor } from '../../services/queries/distributors';

/** El nombre que muestra la empresa: el «nombre para mostrar» de su Apariencia o, si no eligió, el suyo. */
export const useCompanyDisplayName = (): string | null => {
  const { mode } = usePermissions();
  const inCompany = mode !== 'platform';
  const { data: theme } = useCompanyTheme(inCompany);
  const { data: distributor } = useCurrentDistributor(inCompany);
  if (!inCompany) return null;
  return theme?.displayName ?? theme?.companyName ?? distributor?.name ?? null;
};
