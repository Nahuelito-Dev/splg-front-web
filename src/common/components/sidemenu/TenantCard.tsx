import { Tooltip } from '@mui/material';
import { Layers } from 'lucide-react';
import { usePermissions } from '../../../hooks';
import { useCompanyDisplayName } from '../useCompanyDisplayName';
import { useCurrentDistributor } from '../../../services/queries/distributors';
import { usePlatform } from '../../../services/queries/supportSessions';
import { PhotoThumb } from '../ui/PhotoThumb';
import { cx } from '../ui/cx';
import { initialsOf } from '../../../utils/format';

const CARD = 'relative flex items-center rounded-[11px] border border-side-line bg-side-raised px-2.5 py-2';

/**
 * Quién se está mirando: la empresa del admin (con el nombre de su Apariencia), la de la sesión de soporte o, para el administrador general en
 * la plataforma, el nombre de la plataforma (de `GET /v2/platform`, nunca escrito en el panel).
 */
export const TenantCard = ({ mini = false }: { mini?: boolean; onNavigate?: () => void }) => {
  const { mode } = usePermissions();
  const isPlatform = mode === 'platform';
  const { data: distributor } = useCurrentDistributor(!isPlatform);
  const { data: platform } = usePlatform();
  const companyName = useCompanyDisplayName();

  const name = isPlatform ? (platform?.name ?? '…') : (companyName ?? '…');
  const detail = isPlatform
    ? 'Plataforma'
    : mode === 'support'
      ? 'Modo soporte · sólo lectura'
      : mode === 'owned'
        ? 'Empresa propia · de prueba'
        : distributor?.slug;

  return (
    <Tooltip title={mini ? `${name}${detail ? ` · ${detail}` : ''}` : ''} placement="right" arrow>
      <div className={cx(CARD, mini ? 'justify-center px-0' : 'gap-2.5')}>
        <span
          aria-hidden="true"
          className="grid h-[26px] w-[26px] shrink-0 place-items-center overflow-hidden rounded-[7px] bg-tinta-800 text-[11px] font-bold text-side-accent"
        >
          {isPlatform ? (
            <Layers className="h-3.5 w-3.5" strokeWidth={2} />
          ) : distributor ? (
            <PhotoThumb
              kind="distributor"
              id={distributor.distributor_id}
              url={distributor.photoUrl ?? distributor.logo_url}
              size="fill"
              shape="square"
              className="!rounded-none !border-0"
              fallback={initialsOf(name)}
            />
          ) : (
            initialsOf(name)
          )}
        </span>
        {!mini && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">{name}</span>
            {detail && <span className="block truncate text-[11px] font-medium text-side-text">{detail}</span>}
          </span>
        )}
      </div>
    </Tooltip>
  );
};
