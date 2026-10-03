import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  /** Sin `to` ni `onClick`, es la miga actual (la última). */
  to?: string;
  /** Para volver a la lista conservando su búsqueda y filtros (ver `useBackToList`). */
  onClick?: () => void;
}

interface Props {
  title: string;
  /** Línea chica sobre el título (la fecha, la empresa). */
  eyebrow?: string;
  description?: string;
  /** Botones o filtros a la derecha del título. */
  actions?: ReactNode;
  /** Etiquetas de estado al lado del título (el estado de un pedido, de una empresa). */
  badges?: ReactNode;
  /** Ruta de la ficha sobre el título: Lista › Registro (la barra superior ya muestra la sección). */
  breadcrumbs?: Crumb[];
}

const crumbClass =
  'rounded text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

/** El encabezado de cada página: un solo h1 por pantalla, con migas en las fichas. */
export const PageHeader = ({ title, eyebrow, description, actions, breadcrumbs, badges }: Props) => (
  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Ruta de la ficha" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs">
            {breadcrumbs.map((crumb, index) => {
              const last = index === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {crumb.to && !last ? (
                    <Link
                      to={crumb.to}
                      onClick={
                        crumb.onClick &&
                        ((event) => {
                          event.preventDefault();
                          crumb.onClick?.();
                        })
                      }
                      className={crumbClass}
                    >
                      {crumb.label}
                    </Link>
                  ) : crumb.onClick && !last ? (
                    <button type="button" onClick={crumb.onClick} className={crumbClass}>
                      {crumb.label}
                    </button>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={last ? 'font-medium text-ink' : 'text-muted'}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!last && <ChevronRight aria-hidden="true" className="h-3 w-3 text-faint" strokeWidth={2} />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {eyebrow && <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>}
      {badges ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">{title}</h1>
          {badges}
        </div>
      ) : (
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">{title}</h1>
      )}
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
