import { useCRUDModal } from '../../hooks';
import { deleteUser, getAllUsers } from '../../services/api';

import { CustomTable } from '../../common/components/CustomTable/CustomTable';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useUsersStore } from '../../store/useUserStore';
import { UserModal } from './components/UserModal';
import { AddItemFab } from '../../common/components';
import { Typography } from '@mui/material';


// import { UserModal } from './components/UserModal';
// import { AddItemFab } from '../../common/components/AddItemFab';


const columns: GridColDef[] = [
    { flex: 1, field: 'email', headerName: 'email', minWidth: 200 },
    {
        flex: 1, field: 'name', headerName: 'Full name', minWidth: 200,
        renderCell: ({ row }: GridRenderCellParams) => (row.full_name)
    },
    {
        flex: 1,
        field: 'role',
        headerName: 'Rol',
        headerAlign: 'center',
        align: 'center',
        renderCell: ({ row }: GridRenderCellParams) => row.role[0].toUpperCase() + row.role.slice(1),
        minWidth: 150
    },
    {
        flex: 1,
        field: 'created_at',
        headerName: 'Created at',
        headerAlign: 'center',
        align: 'center',
        minWidth: 150,
        renderCell: ({ row }: GridRenderCellParams) => (row.created_at.split('T')[0])
    },
]

export const Users = () => {
    const { modalAction, setActiveUser, setModalAction } = useUsersStore((state) => state)
    const { handleCellClick } = useCRUDModal({
        deleteFn: deleteUser,
        setActiveEntity: setActiveUser,
        queryKey: 'user'
    })

    return (
        <div>
            <Typography sx={{marginBottom: '20px'}} className="text-center" variant="h3" component={"h1"} fontSize={{ xs: "2rem", sm: "3rem", xl: "3.5rem" }} fontWeight={"bold"}>
                Usuarios
            </Typography>
            <div style={{ backgroundColor: 'white', width: '75vw', borderRadius: '12px' }}>
                <CustomTable
                    title={'Users'}
                    columns={columns}
                    queryKey={'user'}
                    pluralQueryKey='Users'
                    queryFn={getAllUsers}
                    handleCellClick={handleCellClick}
                />
                {modalAction && <UserModal />}
                <AddItemFab onClick={() => setModalAction('create')} />
            </div>
        </div>
    )
}


