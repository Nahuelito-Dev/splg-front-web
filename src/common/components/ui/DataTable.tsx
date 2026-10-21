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
import { createContext, useContext, type ReactNode } from 'react';
import { TABLE_DENSE_KEY } from '../../../hooks/useLogout';
import { useStoredFlag } from '../../../hooks/useStoredFlag';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';
import { Switch } from './Switch';

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
  columns: GridColDef<T>[];
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
}

/**
 * Tabla de datos tipada. Envuelve el DataGrid de MUI con los valores del panel:
 * textos en castellano (tema), páginas de 10/25/50 y un estado vacío propio.
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
}: Props<T>) {
  const [dense, setDense] = useStoredFlag(TABLE_DENSE_KEY);
  return (
    <DensityContext.Provider value={{ dense, setDense }}>
      <DataGrid<T>
        rows={rows}
        columns={columns}
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
          noRowsOverlay: () => empty ?? <EmptyState title="No hay datos para mostrar" />,
          loadingOverlay: () => <TableSkeleton columns={columns.length} />,
          footer: TableFooter,
        }}
        sx={{ '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' } }}
      />
    </DensityContext.Provider>
  );
}
