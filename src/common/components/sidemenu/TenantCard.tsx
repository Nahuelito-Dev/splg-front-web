import { Tooltip } from '@mui/material';
import { ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../../hooks';
import { useCurrentDistributor } from '../../../services/queries/distributors';
import { PhotoThumb } from '../ui/PhotoThumb';
import { cx } from '../ui/cx';
import { initialsOf } from '../../../utils/format';

const CARD = 'relative flex items-center rounded-[11px] border border-side-line bg-side-raised px-2.5 py-2';

/**
 * La empresa que se está operando. El administrador general la cambia desde
 * Distribuidoras ("Ver como"); por eso para él la tarjeta es un enlace.
 */
export const TenantCard = ({ mini = false, onNavigate }: { mini?: boolean; onNavigate?: () => void }) => {
  const { isSuperAdmin, needsDistributor } = usePermissions();
  const { data: distributor } = useCurrentDistributor(!needsDistributor);

  const name = needsDistributor ? 'Todas las empresas' : (distributor?.name ?? '…');
  const detail = needsDistributor ? 'Elegí una arriba' : distributor?.slug;

  const body = (
    <>
      <span
        aria-hidden="true"
        className="grid h-[26px] w-[26px] shrink-0 place-items-center overflow-hidden rounded-[7px] bg-tinta-800 text-[11px] font-bold text-llama-300"
      >
        {distributor && !needsDistributor ? (
          <PhotoThumb
            kind="distributor"
            id={distributor.distributor_id}
            url={distributor.photoUrl ?? distributor.logo_url}
            size="fill"
            shape="square"
            className="!rounded-none !border-0"
            fallback={initialsOf(name)}
          />
        ) : needsDistributor ? (
          '∗'
        ) : (
          initialsOf(name)
        )}
      </span>
      {!mini && (
        <>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">{name}</span>
            {detail && <span className="block truncate text-[11px] font-medium text-side-text">{detail}</span>}
          </span>
          {isSuperAdmin && <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-side-text" />}
        </>
      )}
    </>
  );

  const layout = mini ? 'justify-center px-0' : 'gap-2.5';
  if (!isSuperAdmin) {
    return (
      <Tooltip title={mini ? name : ''} placement="right" arrow>
        <div className={cx(CARD, layout)}>{body}</div>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={mini ? `${name}. Cambiar desde Distribuidoras` : ''} placement="right" arrow>
      <Link
        to="/distributors"
        onClick={onNavigate}
        aria-label={`Empresa: ${name}. Cambiar desde Distribuidoras`}
        className={cx(
          CARD,
          layout,
          'transition-colors hover:bg-white/[0.06] focus-visible:ring-llama-400 focus-visible:ring-offset-side',
        )}
      >
        {body}
      </Link>
    </Tooltip>
  );
};
