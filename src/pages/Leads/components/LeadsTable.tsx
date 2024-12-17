import { useEffect, useState } from 'react';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTable } from '../../../hooks';
import { getAllLeads, SearchLead } from '../../../services/api/leads';
import { CustomTable } from '../../../common/components';
import { Lead } from '../../../interfaces';
import { Link } from 'react-router-dom';

// Material UI
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { IconButton, Tooltip} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import React from 'react';

interface Props {
  lead?: Lead;
  setLead: React.Dispatch<React.SetStateAction<any>>;
}

const iconButtonStyle = {
  filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
  borderRadius: '9px',
  background: '#FFF',
  width: '35px',
  height: '36px',
  flexShrink: 0,
  marginRight: 1,
};

export const LeadsTable = ({ lead, setLead }: Props) => {
  const tableProps = useTable({ queryKey: 'leads', queryFn: getAllLeads });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(
    tableProps.data?.leads || []
  );
  const [open, setOpen] = React.useState(false);

  const renderButons = (row: Lead) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Link to={`/leads/details/${row.id}`} style={{ textDecoration: 'none' }}>
        <IconButton sx={iconButtonStyle} title="Ver más Información">
          <InfoOutlinedIcon />
        </IconButton>
      </Link>
    </div>
  );

  const columns: GridColDef[] = [
    { flex: 1, field: 'email', headerName: 'EMAIL', minWidth: 150 },
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
    {
      field: 'contacted',
      headerName: 'Estado',
      width: 80,
      renderCell: ({ row }: GridRenderCellParams) => (
        <Tooltip
          placement="left"
          title={row.contacted ? 'Contactado' : 'No Contactado'}
        >
          {row.contacted ? (
            <CheckCircleIcon color="success" />
          ) : (
            <CloseIcon color="error" />
          )}
        </Tooltip>
      ),
    },
    {
      field: 'acctions',
      headerName: 'Acciones',
      width: 100,
      align: 'center',
      headerClassName: 'table-header',
      headerAlign: 'center',
      renderCell: ({ row }: GridRenderCellParams) => renderButons(row),
    },
  ];
  const determineSearchField = (query: string) => {
    const emailRegex = /\S+@\S+\.\S+/;
    const projectRegex = /^[a-zA-Z0-9\s]+$/;
    if (emailRegex.test(query)) {
      return 'email';
    }
    if (projectRegex.test(query)) {
      return 'project';
    }
    return null;
  };

  const handleSearch = async () => {
    const formattedQuery = searchQuery.trim().toLowerCase();
    if (!formattedQuery) {
      tableProps.refetch();
      setFilteredLeads(tableProps.data?.leads || []);
    } else {
      const searchField = determineSearchField(formattedQuery);
      if (!searchField) {
        return;
      }
      const response = await SearchLead(formattedQuery, 0, 10, searchField);
      setFilteredLeads(response.leads);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads(tableProps.data?.leads || []);
    }
  }, [tableProps.data, searchQuery]);

  return (
    <>
      <CustomTable
        title={'Leads'}
        columns={columns}
        rows={filteredLeads}
        setActive={setLead}
        {...tableProps}
      >
        <div className="w-full max-w-sm min-w-[200px]">
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 h-5 w-5 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 4a6 6 0 100 12 6 6 0 000-12zM21 21l-4.35-4.35"
              />
            </svg>
            <input
              className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md pl-10 pr-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"
              placeholder="Buscar por email o proyecto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="rounded-md bg-slate-800 py-1 px-3 text-white hover:bg-slate-700 ml-2"
              type="button"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        </div>
      </CustomTable>
    </>
  );
};
