import type { GridColDef, GridPaginationModel, GridValidRowModel } from '@mui/x-data-grid';
import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import { EmptyState } from './EmptyState';
import { RowActionsLayoutProvider } from './RowActions';
import { TableSkeleton } from './Skeleton';
import { columnKinds, renderColumnValue, type TableColumn } from './tableColumns';

/** Por debajo de `md` (768 px) las tablas pasan a tarjetas. */
export const NARROW_TABLE_QUERY = '(max-width:767px)';

const LOCAL_PAGE_SIZE = 10;
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="menuitem"], [role="switch"]';
/** Datos debajo del título en la tarjeta (sin contar los marcados `card: true` que se pasen). */
const CARD_DATA = 3;

/** Cuerpo de una tabla vacía: sin encabezados ni paginador, con el vacío centrado. */
export const TableEmpty = ({ children }: { children?: ReactNode }) => (
  <div data-testid="table-empty" className="grid min-h-[240px] place-items-center">
    {children ?? <EmptyState title="No hay datos para mostrar" />}
  </div>
);

interface CardsProps<T extends GridValidRowModel> {
  rows: T[];
  getRowId: (row: T) => string;
  renderCard: (row: T) => ReactNode;
  /** Nombre de lo que se lista, para el estado de carga ("Cargando ajustes"). */
  label: string;
  loading?: boolean;
  /** Paginación en el servidor; sin esto, se pagina de a 10 lo que llega. */
  pagination?: { model: GridPaginationModel; onChange: (model: GridPaginationModel) => void; total: number };
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  onPageChange?: () => void;
}

/**
 * Lista de tarjetas de una tabla en pantallas angostas: una grilla se desplazaría de costado y las acciones quedarían
 * fuera de vista. Las acciones de cada tarjeta van todas en el ⋯.
 */
export function TableCards<T extends GridValidRowModel>({
  rows,
  getRowId,
  renderCard,
  label,
  loading = false,
  pagination,
  empty,
  onRowClick,
  onPageChange,
}: CardsProps<T>) {
  const [localPage, setLocalPage] = useState(0);
  const model = pagination?.model ?? { page: localPage, pageSize: LOCAL_PAGE_SIZE };
  const total = pagination?.total ?? rows.length;
  const lastPage = Math.max(0, Math.ceil(total / model.pageSize) - 1);
  const page = Math.min(model.page, lastPage);
  const visible = pagination ? rows : rows.slice(page * model.pageSize, (page + 1) * model.pageSize);
  const goTo = (next: number) => {
    if (pagination) pagination.onChange({ ...pagination.model, page: next });
    else setLocalPage(next);
    onPageChange?.();
  };

  return (
    <div>
      {loading && rows.length === 0 ? (
        <div role="status" aria-label={`Cargando ${label}`} className="p-4">
          <TableSkeleton rows={3} columns={3} />
        </div>
      ) : rows.length === 0 ? (
        <TableEmpty>{empty}</TableEmpty>
      ) : (
        <RowActionsLayoutProvider value="menu">
          <ul className="divide-y divide-outline" aria-busy={loading} aria-label={label}>
            {visible.map((row) => (
              <li
                key={getRowId(row)}
                className={cx(
                  'min-w-0 space-y-3 p-4',
                  onRowClick &&
                    'cursor-pointer hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                )}
                {...(onRowClick
                  ? {
                      // Con teclado también se llega al detalle: la tarjeta toma el foco y abre con Enter o Espacio.
                      // No lleva `role="button"` porque adentro hay botones (el ⋯), que siguen con su propio foco.
                      tabIndex: 0,
                      onClick: (event: MouseEvent<HTMLLIElement>) => {
                        // Un botón o un enlace de la tarjeta hace lo suyo: el clic no abre además el detalle.
                        const control = (event.target as HTMLElement).closest(INTERACTIVE);
                        if (control && control !== event.currentTarget) return;
                        onRowClick(row);
                      },
                      onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        onRowClick(row);
                      },
                    }
                  : {})}
              >
                {renderCard(row)}
              </li>
            ))}
          </ul>
        </RowActionsLayoutProvider>
      )}
      {total > model.pageSize && (
        <div className="flex items-center justify-between gap-2 border-t border-outline p-3 text-sm text-muted">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => goTo(page - 1)}>
            Anterior
          </Button>
          <span>
            Página {page + 1} de {lastPage + 1}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => goTo(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Tarjeta armada con las columnas de la tabla: arriba la principal (título y subtítulo), el estado como insignia y el
 * ⋯ con las acciones; abajo, hasta tres datos más con su encabezado como etiqueta (y los marcados `card: true`).
 */
export function ColumnCard<T extends GridValidRowModel>({
  row,
  id,
  columns,
}: {
  row: T;
  id: string;
  columns: TableColumn<T>[];
}) {
  const kinds = columnKinds(columns);
  const pick = (kind: string) => columns.find((_, index) => kinds[index] === kind);
  const main = pick('main');
  const status = pick('status');
  const actions = pick('actions');
  const candidates = columns.filter(
    (column, index) => column.card !== false && !['main', 'status', 'actions'].includes(kinds[index] ?? ''),
  );
  // Las marcadas `card: true` van siempre; las demás completan hasta tres. Se respeta el orden de la tabla.
  const forced = candidates.filter((column) => column.card === true);
  const fill = candidates.filter((column) => column.card !== true).slice(0, Math.max(0, CARD_DATA - forced.length));
  const data = candidates.filter((column) => forced.includes(column) || fill.includes(column));
  const content = (column: GridColDef<T>) => renderColumnValue(column, row, id);
  const title = main ? content(main) : null;

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {typeof title === 'string' ? <p className="truncate font-semibold text-ink">{title}</p> : title}
        </div>
        {status && <div className="shrink-0 pt-0.5">{content(status)}</div>}
        {actions && <div className="-my-1 shrink-0">{content(actions)}</div>}
      </div>
      {data.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          {data.map((column) => (
            <div key={column.field} className="min-w-0">
              {column.headerName && <dt className="truncate text-[11.5px] text-muted">{column.headerName}</dt>}
              <dd className="min-w-0 truncate text-ink [&_.block]:truncate">{content(column)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
