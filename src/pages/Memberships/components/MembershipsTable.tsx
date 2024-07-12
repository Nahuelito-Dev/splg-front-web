import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import { useTable } from "../../../hooks";

import { getAllUsers } from "../../../services/api";

import { CustomTable } from "../../../common/components";

import { User } from "../../../interfaces";
interface Props {
  user?: User;
  setUser: React.Dispatch<React.SetStateAction<any>>;
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
 // { flex: 1, field: "email", headerName: "email", minWidth: 200 },
  {
    flex: 1,
    field: "name",
    headerName: "Membership",
    minWidth: 200,
    renderCell: ({ row }: GridRenderCellParams) => row.fullName,
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

export const MembershipsTable = ({ user, setUser }: Props) => {
  const tableProps = useTable({ queryKey: "users", queryFn: getAllUsers });

  return (
    <CustomTable
      title={"Membresias"}
      columns={columns}
      rows={tableProps.data?.users}
      setActive={setUser}
      {...tableProps}
    />
  );
};
