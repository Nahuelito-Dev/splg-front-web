import { useMediaQuery } from '@mui/material';
import type { GridColDef, GridPaginationModel, GridValidRowModel } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

interface Props<T extends GridValidRowModel> {
  rows: T[];
  columns: GridColDef<T>[];
  getRowId: (row: T) => string;
  /** Cómo se dibuja una fila en pantallas angostas. */
  renderCard: (row: T) => ReactNode;
  /** Nombre de lo que se lista, para el estado de carga ("Cargando ajustes"). */
  label: string;
  loading?: boolean;
  pagination?: { model: GridPaginationModel; onChange: (model: GridPaginationModel) => void; total: number };
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Tabla en escritorio y lista de tarjetas hasta 639 px: en una pantalla angosta la grilla se desplazaría de costado
 * y las acciones quedarían fuera de vista (mismo criterio que Cobros impagos).
 */
export function ResponsiveTable<T extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  renderCard,
  label,
  loading = false,
  pagination,
  empty,
  onRowClick,
}: Props<T>) {
  const narrow = useMediaQuery('(max-width:639px)');
  if (!narrow) {
    return (
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        pagination={pagination}
        empty={empty}
        onRowClick={onRowClick}
      />
    );
  }
  const lastPage = pagination ? Math.max(0, Math.ceil(pagination.total / pagination.model.pageSize) - 1) : 0;
  return (
    <div>
      {loading && rows.length === 0 ? (
        <div role="status" aria-label={`Cargando ${label}`} className="p-4">
          <TableSkeleton rows={3} columns={3} />
        </div>
      ) : rows.length === 0 ? (
        (empty ?? <EmptyState title="No hay datos para mostrar" />)
      ) : (
        <ul className="divide-y divide-outline" aria-busy={loading}>
          {rows.map((row) => (
            <li key={getRowId(row)} className="min-w-0 space-y-3 p-4">
              {renderCard(row)}
            </li>
          ))}
        </ul>
      )}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-outline p-3 text-sm text-muted">
          <Button
            size="sm"
            variant="secondary"
            disabled={pagination.model.page === 0}
            onClick={() => pagination.onChange({ ...pagination.model, page: pagination.model.page - 1 })}
          >
            Anterior
          </Button>
          <span>
            Página {pagination.model.page + 1} de {lastPage + 1}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={pagination.model.page >= lastPage}
            onClick={() => pagination.onChange({ ...pagination.model, page: pagination.model.page + 1 })}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
