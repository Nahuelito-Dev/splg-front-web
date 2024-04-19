import { useEffect, useState } from 'react';

import { Typography, Box } from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';

import { TableLoadingOrNoData } from './TableLoadingOrNoData';
import { EditAndDeleteFields } from './EditAndDeleteFields';


interface ICustomTableProps {
    title: string;
    columns: GridColDef[];
    rows: GridRowsProp;
    actualPage?: number;
    setActualPage: React.Dispatch<React.SetStateAction<number>>;
    rowsPerPage?: number;
    setRowsPerPage: React.Dispatch<React.SetStateAction<number>>;
    maxRowsToShow: number;
    setActive?: React.Dispatch<React.SetStateAction<any>>;
    isLoading: boolean;
    isMutating: boolean;
}

export const CustomTable = ({ title, columns, rows = [], actualPage = 0, rowsPerPage = 5, maxRowsToShow, setActualPage, setRowsPerPage, isLoading, isMutating, setActive }: ICustomTableProps) => {
    const [paginationModel, setPaginationModel] = useState({
        pageSize: rowsPerPage,
        page: actualPage
    });

    useEffect(() => {
        setActualPage(paginationModel.page);
        setRowsPerPage(paginationModel.pageSize);
    }, [paginationModel, setActualPage, setRowsPerPage])

    const handleCellClick = (e: any) => {
        if (isLoading || isMutating) return
        setActive!(e)
    }

    return (
        <Box
            sx={{
                width: "80%",
                // height: "70vh",
                minHeight: "460px",
                backgroundColor: "white",
                borderRadius: 2,
                padding: 1,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Typography
                className="text-center"
                variant="h3"
                component={"h1"}
                fontSize={{ xs: "2rem", sm: "3rem", xl: "3.5rem" }}
                fontWeight={"bold"}
                my={1}
            >
                {title}
            </Typography>
            {isLoading || rows.length === 0 ? (
                <TableLoadingOrNoData status={isLoading ? "loading" : "noData"} />
            ) : (
                <DataGrid
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                        rowCount={maxRowsToShow ?? 5}
                    rows={rows}
                    onCellClick={handleCellClick}
                        columns={[...columns, ...EditAndDeleteFields(isMutating)]}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                    paginationMode="server"
                    sx={{
                        backgroundColor: "white",
                        flex: 1,
                    }}
                />
            )}
        </Box>
    );
}