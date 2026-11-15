import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppSelector, usePermissions } from '../../hooks';
import { useCompanyContext } from '../../services/queries/companyContext';
import { companyThemeKey, useCompanyTheme } from '../../services/queries/companyTheme';
import { applyCompanyTheme, clearCompanyTheme } from '../../theme';

const sameKey = (a: readonly unknown[], b: readonly unknown[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Aplica el tema de la empresa del contexto (company, support, owned) y lo saca al salir de él. La plataforma y el
 * ingreso siguen con Brasa (OrixTech), y una empresa sin tema propio también (`isDefault`).
 *
 * El tema se pide con la identidad del contexto en la clave: al pasar de A a B el tema de A no se lee como el de B
 * (hasta que llega el de B rige Brasa). Al cambiar de contexto el panel hace `queryClient.clear()`: en ese mismo paso,
 * al descartarse el tema aplicado, se limpian las variables, antes de que se pinte nada con el contexto nuevo.
 */
export const CompanyThemeSync = () => {
  const status = useAppSelector((state) => state.auth.status);
  const { mode } = usePermissions();
  const context = useCompanyContext();
  const enabled = status === 'authenticated' && mode !== 'platform';
  const { data } = useCompanyTheme(enabled);
  const tokens = enabled && data && !data.isDefault ? data.tokens : null;
  const queryClient = useQueryClient();
  const applied = useRef<string | null>(null);

  useLayoutEffect(() => {
    applyCompanyTheme(tokens);
    applied.current = tokens ? context : null;
  }, [tokens, context]);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        const current = applied.current;
        if (
          event.type === 'removed' &&
          current !== null &&
          sameKey(event.query.queryKey as readonly unknown[], companyThemeKey(current))
        ) {
          applied.current = null;
          clearCompanyTheme();
        }
      }),
    [queryClient],
  );

  useEffect(() => clearCompanyTheme, []);

  return null;
};
