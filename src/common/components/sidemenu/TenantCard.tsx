import { ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../../hooks';
import { useCurrentDistributor } from '../../../services/queries/distributors';
import { cx } from '../ui/cx';
import { initialsOf } from '../../../utils/format';

const CARD = 'relative flex items-center gap-2.5 rounded-[11px] border border-side-line bg-side-raised px-2.5 py-2';

/**
 * La empresa que se está operando. El administrador general la cambia desde
 * Distribuidoras ("Ver como"); por eso para él la tarjeta es un enlace.
 */
export const TenantCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { isSuperAdmin, needsDistributor } = usePermissions();
  const { data: distributor } = useCurrentDistributor(!needsDistributor);

  const name = needsDistributor ? 'Todas las empresas' : (distributor?.name ?? '…');
  const detail = needsDistributor ? 'Elegí una con «Ver como»' : distributor?.slug;

  const body = (
    <>
      <span
        aria-hidden="true"
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] bg-tinta-800 text-[11px] font-bold text-llama-300"
      >
        {needsDistributor ? '∗' : initialsOf(name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-white">{name}</span>
        {detail && <span className="block truncate text-[11px] font-medium text-side-text">{detail}</span>}
      </span>
      {isSuperAdmin && <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-side-text" />}
    </>
  );

  if (!isSuperAdmin) return <div className={CARD}>{body}</div>;
  return (
    <Link
      to="/distributors"
      onClick={onNavigate}
      aria-label={`Empresa: ${name}. Cambiar desde Distribuidoras`}
      className={cx(
        CARD,
        'transition-colors hover:bg-white/[0.06] focus-visible:ring-llama-400 focus-visible:ring-offset-side',
      )}
    >
      {body}
    </Link>
  );
};
