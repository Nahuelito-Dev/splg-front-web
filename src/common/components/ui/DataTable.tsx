import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
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

interface Props<T extends GridValidRowModel> {
  rows: T[];
  columns: GridColDef<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Paginación en el servidor; sin esto, la tabla pagina lo que recibe. */
  pagination?: ServerPagination;
  empty?: ReactNode;
  rowHeight?: number;
  /** Clic en la fila: abre el detalle (además del botón "Ver detalle" de RowActions). */
  onRowClick?: (row: T) => void;
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
      disableColumnMenu
      onRowClick={onRowClick ? (params: GridRowParams<T>) => onRowClick(params.row) : undefined}
      pageSizeOptions={[10, 25, 50]}
      {...(pagination
        ? {
            paginationMode: 'server' as const,
            paginationModel: pagination.model,
            onPaginationModelChange: pagination.onChange,
            rowCount: pagination.total,
          }
        : { initialState: { pagination: { paginationModel: { pageSize: 10, page: 0 } } } })}
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
        '& .MuiDataGrid-footerContainer': { borderTopColor: theme.palette.divider },
        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within': {
          outline: 'none',
        },
      })}
    />
  );
}
