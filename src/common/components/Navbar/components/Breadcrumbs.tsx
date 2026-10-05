import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cx } from '../../ui/cx';
import { buildBreadcrumbs, type Crumb } from '../breadcrumbs';
import type { CrumbOverride } from '../crumbContext';
import { useCrumbOverride } from '../useCrumbLeaf';

type NavCrumb = Crumb & { onClick?: () => void };

/** En una ficha, la última miga es el nombre de la entidad y la de la lista vuelve conservando sus filtros. */
const withOverride = (crumbs: Crumb[], override: CrumbOverride | null): NavCrumb[] => {
  if (!override || crumbs.length < 3) return crumbs;
  return crumbs.map((crumb, index) => {
    if (index === crumbs.length - 1) return { ...crumb, label: override.label };
    if (index === crumbs.length - 2) return { ...crumb, onClick: override.onBack };
    return crumb;
  });
};

/** Clic común: con Cmd/Ctrl/Shift/Alt o botón del medio el link conserva su comportamiento nativo (nueva pestaña). */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const backOnClick = (crumb: NavCrumb) =>
  crumb.onClick &&
  ((event: MouseEvent) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    crumb.onClick?.();
  });

/** Migas de pan de la ruta actual (modelo `custom-breadcrumbs` de Minimal): la última es la página. */
export const Breadcrumbs = ({ className }: { className?: string }) => {
  const { pathname } = useLocation();
  const override = useCrumbOverride();
  const crumbs = withOverride(buildBreadcrumbs(pathname), override);
  if (crumbs.length === 0) return null;

  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;

  return (
    <>
      {parent?.to && (
        <Link
          to={parent.to}
          onClick={backOnClick(parent)}
          aria-label={`Volver a ${parent.label}`}
          className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink sm:hidden"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{parent.label}</span>
        </Link>
      )}
      <nav aria-label="Migas de pan" className={cx('min-w-0', className)}>
        <ol className="flex items-center gap-1.5 text-[13px]">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li
                key={`${index}-${crumb.label}`}
                className={cx('flex min-w-0 items-center gap-1.5', !isLast && 'shrink-0')}
              >
                {index > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-faint" />}
                {isLast ? (
                  <span aria-current="page" className="truncate font-semibold text-ink">
                    {crumb.label}
                  </span>
                ) : crumb.to ? (
                  <Link
                    to={crumb.to}
                    onClick={backOnClick(crumb)}
                    className="text-muted transition-colors hover:text-ink hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-muted">{crumb.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
