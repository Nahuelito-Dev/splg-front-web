import { useMediaQuery } from '@mui/material';
import type { GridColDef, GridPaginationModel, GridValidRowModel } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { DataTable } from './DataTable';
import { NARROW_TABLE_QUERY, TableCards } from './TableCards';
import type { TableColumn } from './tableColumns';

interface Props<T extends GridValidRowModel> {
  rows: T[];
  columns: TableColumn<T>[] | GridColDef<T>[];
  getRowId: (row: T) => string;
  /** Cómo se dibuja una fila en pantallas angostas (si la tarjeta armada con las columnas no alcanza). */
  renderCard: (row: T) => ReactNode;
  /** Nombre de lo que se lista, para el estado de carga ("Cargando ajustes"). */
  label: string;
  loading?: boolean;
  pagination?: { model: GridPaginationModel; onChange: (model: GridPaginationModel) => void; total: number };
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Tabla en escritorio y lista de tarjetas propias por debajo de 768 px (el mismo corte que `DataTable`, que sin
 * `renderCard` arma la tarjeta con las columnas).
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
  const narrow = useMediaQuery(NARROW_TABLE_QUERY);
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
        label={label}
      />
    );
  }
  return (
    <TableCards
      rows={rows}
      getRowId={getRowId}
      renderCard={renderCard}
      label={label}
      loading={loading}
      pagination={pagination}
      empty={empty}
      onRowClick={onRowClick}
    />
  );
}
