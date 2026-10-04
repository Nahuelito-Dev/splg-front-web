import { Link } from 'react-router-dom';
import { Cylinder as CylinderIcon } from 'lucide-react';
import { Badge, Card, EmptyState, ListSkeleton } from '../../../common/components/ui';
import type { CylinderFilters } from '../../../services/api/physicalCylinders';
import { useCylinders } from '../../../services/queries/physicalCylinders';
import { CYLINDER_CARD_LIMIT } from '../cylinderFilters';
import { formatDate } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  title: string;
  /** Qué envases mostrar: los de un pedido (`orderId`) o los de un cliente (`customerUserId`). */
  filters: Pick<CylinderFilters, 'orderId' | 'customerUserId'>;
  emptyTitle: string;
  emptyDescription: string;
  /** Enlace al listado de Envases con el mismo filtro. */
  listSearch: string;
  /** Si es una pestaña de una ficha, el título ya lo dice la pestaña. */
  bare?: boolean;
}

/** Series de envases de un pedido o de un cliente: serial (enlace a su ficha), tipo, estado y último movimiento. */
export const CylinderLinksCard = ({
  title,
  filters,
  emptyTitle,
  emptyDescription,
  listSearch,
  bare = false,
}: Props) => {
  const { data, isPending, error } = useCylinders(filters, { page: 0, pageSize: CYLINDER_CARD_LIMIT });

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-outline p-4">
        <h2
          className={
            bare ? 'text-base font-semibold text-ink' : 'text-xs font-semibold uppercase tracking-wide text-muted'
          }
        >
          {title}
        </h2>
        <span className="text-sm text-muted">{data ? `${data.total} en total` : ''}</span>
      </div>
      {isPending ? (
        <ListSkeleton rows={3} columns={3} />
      ) : error ? (
        <p className="p-4 text-sm text-danger" role="alert">
          No se pudieron cargar los envases.
        </p>
      ) : data.rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <ul className="divide-y divide-outline-soft">
            {data.rows.map((cylinder) => (
              <li
                key={cylinder.cylinder_id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CylinderIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <div className="min-w-0">
                    <Link
                      to={`/physical-cylinders/${cylinder.cylinder_id}`}
                      className="block truncate font-mono text-sm font-medium text-primary-strong hover:underline"
                    >
                      {cylinder.serial}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {cylinder.gas_cylinder
                        ? `${cylinder.gas_cylinder.type} · ${cylinder.gas_cylinder.weight} kg`
                        : 'Sin producto asignado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {cylinder.lastMovementAt ? `Movido el ${formatDate(cylinder.lastMovementAt)}` : 'Sin movimientos'}
                  </span>
                  <Badge label={labelOf(CYLINDER_STATE, cylinder.state)} />
                </div>
              </li>
            ))}
          </ul>
          {data.total > data.rows.length && (
            <p className="border-t border-outline px-4 py-3 text-sm text-muted">
              Se muestran {data.rows.length} de {data.total}.{' '}
              <Link to={`/physical-cylinders?${listSearch}`} className="text-primary-strong hover:underline">
                Ver todos en Envases
              </Link>
            </p>
          )}
        </>
      )}
    </Card>
  );
};
