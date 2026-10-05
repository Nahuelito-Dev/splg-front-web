import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
  type GridRowSelectionModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

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
  return (
    <DataGrid<T>
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      loading={loading}
      autoHeight
      rowHeight={rowHeight}
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
      }}
      sx={(theme) => ({
        border: 0,
        fontSize: 13,
        color: theme.palette.text.primary,
        '--DataGrid-rowBorderColor': theme.palette.divider,
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.action.hover : theme.palette.grey[50],
          borderBottomColor: theme.palette.divider,
        },
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 500, fontSize: 12, color: theme.palette.text.secondary },
        '& .MuiDataGrid-row:hover': { backgroundColor: theme.palette.action.hover },
        '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' },
        '& .MuiDataGrid-columnHeader:first-of-type, & .MuiDataGrid-cell:first-of-type': { paddingLeft: '18px' },
        '& .MuiDataGrid-cell': { borderColor: theme.palette.divider, display: 'flex', alignItems: 'center' },
        // Con la tabla vacía (o cargando sin filas) el DataGrid autoajustado deja una franja mínima: el vacío ilustrado no entra.
        '& .MuiDataGrid-overlayWrapper': { minHeight: 280 },
        '& .MuiDataGrid-footerContainer': { borderTopColor: theme.palette.divider },
        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within': {
          outline: 'none',
        },
      })}
    />
  );
}
