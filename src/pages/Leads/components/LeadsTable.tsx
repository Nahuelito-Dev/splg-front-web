import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import { useTable } from '../../../hooks';

import { getAllLeads } from '../../../services/api/leads';

import { CustomTable } from '../../../common/components';

import { Lead } from '../../../interfaces';
interface Props {
  lead?: Lead;
  setLead: React.Dispatch<React.SetStateAction<any>>;
}

// const RoleSelect = ({ role }: { role: string }) => {
//     return <Select
//         value={role}
//         label="Rol"
//         className='text-center'
//         //   onChange={({ target }) => onRoleUpdated(row.id, target.value)}
//         sx={{ width: '300px', boxShadow: 'none', '.MuiOutlinedInput-notchedOutline': { border: 0 } }}
//     >
//         <MenuItem value='admin'> Admin </MenuItem>
//         <MenuItem value='superAdmin'> Super User </MenuItem>
//         <MenuItem value='worker'> accountant </MenuItem>
//     </Select>
// }

const columns: GridColDef[] = [
  { flex: 1, field: 'email', headerName: 'EMAIL', minWidth: 100 },
  {
    flex: 1,
    field: 'name',
    headerName: 'NAME',
    minWidth: 80,
    renderCell: ({ row }: GridRenderCellParams) => row.name,
  },
  {
    flex: 1,
    field: 'phone',
    headerName: 'PHONE',
    minWidth: 80,
    renderCell: ({ row }: GridRenderCellParams) => row.phone,
  },
  {
    flex: 1,
    field: 'project',
    headerName: 'PROJECT',
    minWidth: 80,
    renderCell: ({ row }: GridRenderCellParams) => row.project,
  },
  {
    flex: 1,
    field: 'message',
    headerName: 'MESSAGE',
    minWidth: 200,
    renderCell: ({ row }: GridRenderCellParams) => row.message,
  },

  // {
  //     flex: 1,
  //     field: 'role',
  //     headerName: 'Rol',
  //     headerAlign: 'center',
  //     align: 'center',
  //     renderCell: ({ row }: GridRenderCellParams) => row.role[0].toUpperCase() + row.role.slice(1),
  //     minWidth: 150
  // },
  // {
  //     flex: 1,
  //     field: 'created_at',
  //     headerName: 'Created at',
  //     headerAlign: 'center',
  //     align: 'center',
  //     minWidth: 150,
  //     renderCell: ({ row }: GridRenderCellParams) => (row.created_at.split('T')[0])
  // },
];

export const LeadsTable = ({ lead, setLead }: Props) => {
  const tableProps = useTable({ queryKey: 'leads', queryFn: getAllLeads });
  return (
    <CustomTable
      title={'Leads'}
      columns={columns}
      rows={tableProps.data?.leads}
      setActive={setLead}
      {...tableProps}
    />
  );
};
