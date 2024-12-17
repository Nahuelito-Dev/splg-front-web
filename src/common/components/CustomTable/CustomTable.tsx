import { useEffect, useState } from 'react';
import { Stack, Typography, Box } from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';

import { TableLoadingOrNoData } from './TableLoadingOrNoData';
//import { EditAndDeleteFields } from './EditAndDeleteFields';

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
    if (isLoading || isMutating) return;
    setActive!(e);
  };

  return (
    <Box
      sx={{
        width: '95%',
        minHeight: '460px',
        backgroundColor: 'white',
        borderRadius: 2,
        padding: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        spacing={2}
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={2}
        width="100%"
      >
        <Typography
          sx={{
            flex: '1 1 100%',
            fontSize: { xs: '0.875rem', sm: '1.25rem', md: '1.5rem' },
            color: 'black',
          }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title}
        </Typography>
        {children}
      </Stack>

      {isLoading || rows.length === 0 ? (
        <TableLoadingOrNoData status={isLoading ? 'loading' : 'noData'} />
      ) : (
        <DataGrid
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={maxRowsToShow ?? 5}
          rows={rows}
          onCellClick={handleCellClick}
          columns={[...columns]}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
          paginationMode="server"
          sx={{
            backgroundColor: 'white',
            flex: 1,
          }}
        />
      )}
    </Box>
  );
};
