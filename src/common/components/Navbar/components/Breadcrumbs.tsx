import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cx } from '../../ui/cx';
import { buildBreadcrumbs } from '../breadcrumbs';

/** Migas de pan de la ruta actual (modelo `custom-breadcrumbs` de Minimal): la última es la página. */
export const Breadcrumbs = ({ className }: { className?: string }) => {
  const { pathname } = useLocation();
  const crumbs = buildBreadcrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
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
                <Link to={crumb.to} className="text-muted transition-colors hover:text-ink hover:underline">
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
  );
};
