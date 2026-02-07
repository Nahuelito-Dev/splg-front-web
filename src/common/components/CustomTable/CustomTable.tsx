import { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { TableLoadingOrNoData } from './TableLoadingOrNoData';

interface ICustomTableProps {
  title: string;
  columns: GridColDef[];
  rows: GridRowsProp;
  actualPage?: number;
  setActualPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage?: number;
  children?: React.ReactNode | React.ReactNode[];
  setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
  maxRowsToShow: number;
  setActive?: React.Dispatch<React.SetStateAction<any>>;
  isLoading: boolean;
  isMutating: boolean;
  getRowId?: (row: any) => string | number; // Agregado para flexibilidad
}

export const CustomTable = ({
  title,
  columns,
  rows = [],
  actualPage = 0,
  children,
  rowsPerPage = 5,
  maxRowsToShow,
  setActualPage,
  setRowsPerPage,
  isLoading,
  isMutating,
  setActive,
  getRowId,
}: ICustomTableProps) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: rowsPerPage,
    page: actualPage,
  });

  useEffect(() => {
    setActualPage(paginationModel.page);
    setRowsPerPage(paginationModel.pageSize);
  }, [paginationModel, setActualPage, setRowsPerPage]);

  const handleCellClick = (e: any) => {
    if (isLoading || isMutating || !setActive) return;
    setActive(e);
  };

  return (
    <div className="w-full min-h-[500px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header de la Tabla */}
      <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
          {title}
        </h2>
        <div className="w-full sm:w-auto flex items-center gap-2">
          {children}
        </div>
      </div>

      {/* Cuerpo de la Tabla / Loading State */}
      <div className="flex-1 w-full p-2">
        {isLoading || rows.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <TableLoadingOrNoData status={isLoading ? 'loading' : 'noData'} />
          </div>
        ) : (
          <DataGrid
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={maxRowsToShow ?? 5}
            rows={rows}
            getRowId={getRowId || ((row) => row.id)} // Fallback al id estándar
            onCellClick={handleCellClick}
            columns={columns}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            paginationMode="server"
            className="border-none text-slate-700"
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f8fafc', // slate-50
                color: '#64748b', // slate-500
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f1f5f9', // slate-100
                padding: '12px',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid #f1f5f9',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f1f5f9', // slate-100
                cursor: 'pointer',
              },
              border: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};
