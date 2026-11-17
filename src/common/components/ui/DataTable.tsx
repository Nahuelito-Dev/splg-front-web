import {
  DataGrid,
  GridFooterContainer,
  GridPagination,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
  type GridRowSelectionModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { useMediaQuery } from '@mui/material';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { TABLE_DENSE_KEY } from '../../../hooks/useLogout';
import { useStoredFlag } from '../../../hooks/useStoredFlag';
import { cx } from './cx';
import { TableSkeleton } from './Skeleton';
import { Switch } from './Switch';
import { ColumnCard, NARROW_TABLE_QUERY, TableCards, TableEmpty } from './TableCards';
import { layoutColumns, type TableColumn } from './tableColumns';
import { useScrollHint } from './useScrollHint';

export type { ColumnKind, TableColumn } from './tableColumns';

const ROW_HEIGHT_DENSE = 44;

const DensityContext = createContext<{ dense: boolean; setDense: (dense: boolean) => void }>({
  dense: false,
  setDense: () => undefined,
});

/** Pie de la grilla: el interruptor «Denso» (filas más bajas, recordado en el dispositivo) y la paginación. */
const TableFooter = () => {
  const { dense, setDense } = useContext(DensityContext);
  return (
    <GridFooterContainer>
      <label className="flex items-center gap-2 pl-4 text-[13px] text-ink-2">
        <Switch checked={dense} onChange={setDense} label="Denso" />
        Denso
      </label>
      <GridPagination />
    </GridFooterContainer>
  );
};

interface ServerPagination {
  model: GridPaginationModel;
  onChange: (model: GridPaginationModel) => void;
  /** Total sin paginar (de la API). */
  total: number;
}

interface Selection<T> {
  /** Ids de las filas marcadas (se conservan al paginar). */
  ids: string[];
  onChange: (ids: string[]) => void;
  /** Filas que no se pueden marcar (p. ej. pedidos ya cerrados). */
  isSelectable?: (row: T) => boolean;
}

interface Props<T extends GridValidRowModel> {
  rows: T[];
  columns: TableColumn<T>[] | GridColDef<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Paginación en el servidor; sin esto, la tabla pagina lo que recibe. */
  pagination?: ServerPagination;
  empty?: ReactNode;
  rowHeight?: number;
  /** Clic en la fila: abre el detalle (además del botón "Ver" de RowActions). */
  onRowClick?: (row: T) => void;
  /** Selección múltiple con casilla por fila y en el encabezado; sin esto no hay casillas. */
  selection?: Selection<T>;
  /** Avisa que se cambió de página (también en la paginación local), p. ej. para soltar la selección. */
  onPageChange?: () => void;
  /**
   * Debajo de 768 px: `cards` (por defecto) pasa a una tarjeta por fila armada con las columnas; `scroll` deja la
   * grilla, que se desplaza de costado con un degradé en el borde. Con selección múltiple, `scroll`.
   */
  narrow?: 'cards' | 'scroll';
  /** Nombre de lo que se lista, para el aviso de carga de las tarjetas ("Cargando clientes"). */
  label?: string;
}

const virtualScroller = (root: HTMLElement) => root.querySelector<HTMLElement>('.MuiDataGrid-virtualScroller');

/**
 * Tabla de datos tipada. Envuelve el DataGrid de MUI con los valores del panel: textos en castellano (tema), páginas
 * de 10/25/50, el ancho de las columnas repartido con una sola regla (`layoutColumns`), un vacío sin encabezados ni
 * paginador y, en el celular, una tarjeta por fila.
 *
 * Vacía (sin filas, sin carga y con total 0) no dibuja el DataGrid: lo desmonta y muestra `TableEmpty`. Al volver a
 * tener filas la grilla se monta de nuevo, así que su estado interno (orden por columna, foco de celda, desplazamiento
 * horizontal) arranca de cero. Lo que tiene que sobrevivir a un filtro sin resultados (página, selección, densidad)
 * vive afuera: en `pagination`, en `selection` y en el dispositivo (`Denso`).
 */
export function DataTable<T extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading = false,
  pagination,
  empty,
  rowHeight = 60,
  onRowClick,
  selection,
  onPageChange,
  narrow: narrowMode,
  label = 'datos',
}: Props<T>) {
  const [dense, setDense] = useStoredFlag(TABLE_DENSE_KEY);
  const narrow = useMediaQuery(NARROW_TABLE_QUERY);
  const sourceColumns = columns as TableColumn<T>[];
  const laidOut = useMemo(() => layoutColumns(sourceColumns), [sourceColumns]);
  const hint = useScrollHint<HTMLDivElement>('x', virtualScroller);
  const mode = narrowMode ?? (selection ? 'scroll' : 'cards');
  const isEmpty = !loading && rows.length === 0 && (!pagination || pagination.total === 0);

  if (narrow && mode === 'cards') {
    return (
      <TableCards
        rows={rows}
        getRowId={getRowId}
        label={label}
        loading={loading}
        pagination={pagination}
        empty={empty}
        onRowClick={onRowClick}
        onPageChange={onPageChange}
        renderCard={(row) => <ColumnCard row={row} id={getRowId(row)} columns={sourceColumns} />}
      />
    );
  }
  if (isEmpty) return <TableEmpty>{empty}</TableEmpty>;

  return (
    <DensityContext.Provider value={{ dense, setDense }}>
      <div ref={hint.ref} className="relative">
        <DataGrid<T>
          rows={rows}
          columns={laidOut}
          getRowId={getRowId}
          loading={loading}
          autoHeight
          rowHeight={dense ? ROW_HEIGHT_DENSE : rowHeight}
          disableRowSelectionOnClick
          {...(selection
            ? {
                checkboxSelection: true,
                keepNonExistentRowsSelected: true,
                rowSelectionModel: selection.ids,
                onRowSelectionModelChange: (model: GridRowSelectionModel) => selection.onChange(model.map(String)),
                isRowSelectable: selection.isSelectable
                  ? (params: GridRowParams<T>) => selection.isSelectable?.(params.row) ?? true
                  : undefined,
              }
            : {})}
          disableColumnMenu
          onRowClick={onRowClick ? (params: GridRowParams<T>) => onRowClick(params.row) : undefined}
          pageSizeOptions={[10, 25, 50]}
          {...(pagination
            ? {
                paginationMode: 'server' as const,
                paginationModel: pagination.model,
                onPaginationModelChange: (model: GridPaginationModel) => {
                  pagination.onChange(model);
                  onPageChange?.();
                },
                rowCount: pagination.total,
              }
            : {
                initialState: { pagination: { paginationModel: { pageSize: 10, page: 0 } } },
                onPaginationModelChange: () => onPageChange?.(),
              })}
          slots={{
            noRowsOverlay: () => <TableEmpty>{empty}</TableEmpty>,
            loadingOverlay: () => <TableSkeleton columns={columns.length} />,
            footer: TableFooter,
          }}
          sx={{ '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' } }}
        />
        <span
          aria-hidden="true"
          data-testid="table-scroll-hint"
          className={cx(
            'pointer-events-none absolute bottom-[53px] right-0 top-0 w-6 bg-gradient-to-l from-surface to-transparent transition-opacity',
            hint.more ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </DensityContext.Provider>
  );
}
