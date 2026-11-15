import { useCompanyTheme } from '../../services/queries/companyTheme';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { usePlatform } from '../../services/queries/supportSessions';
import { useCompanyDisplayName } from './useCompanyDisplayName';
import { initialsOf } from '../../utils/format';
import { PhotoThumb } from './ui/PhotoThumb';
import { cx } from './ui/cx';

interface Props {
  className?: string;
  /** Sólo el logo (menú lateral reducido). */
  markOnly?: boolean;
  subtitle?: string;
}

/**
 * La marca del encabezado en el panel de una empresa: su logo y su nombre (los de su Apariencia), no los de la
 * plataforma. Sin logo, las iniciales sobre el color de la empresa.
 */
export const CompanyBrand = ({ className, markOnly = false, subtitle }: Props) => {
  const { data: theme } = useCompanyTheme(true);
  const { data: distributor } = useCurrentDistributor(true);
  const name = useCompanyDisplayName();
  return (
    <div className={cx('flex select-none items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-gradient-to-br from-primary-from to-primary-to text-[12px] font-bold text-on-primary shadow-card"
      >
        {distributor ? (
          <PhotoThumb
            kind="distributor"
            id={distributor.distributor_id}
            url={theme?.logoUrl ?? distributor.photoUrl}
            size="fill"
            shape="square"
            className="!rounded-none !border-0 bg-surface object-contain"
            fallback={initialsOf(name ?? '')}
          />
        ) : (
          initialsOf(name ?? '')
        )}
      </span>
      <span className={cx('min-w-0 leading-tight', markOnly && 'sr-only')}>
        <span className="block truncate text-base font-bold tracking-[-0.02em] text-white" title={name ?? undefined}>
          {name ?? ' '}
        </span>
        {subtitle && <span className="block text-[11px] font-medium text-side-text">{subtitle}</span>}
      </span>
    </div>
  );
};

/** «con tecnología de OrixTech», chico, al pie del menú de una empresa. El nombre sale de `GET /v2/platform`. */
export const PoweredByPlatform = ({ className }: { className?: string }) => {
  const { data: platform } = usePlatform();
  if (!platform?.name) return null;
  return (
    <p className={cx('text-center text-[10.5px] font-medium text-side-text/70', className)}>
      con tecnología de <span className="font-semibold text-side-text">{platform.name}</span>
    </p>
  );
};
