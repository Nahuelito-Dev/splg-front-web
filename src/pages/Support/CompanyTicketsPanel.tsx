import type { GridColDef } from '@mui/x-data-grid';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  IdentityCell,
  ResponsiveTable,
  Select,
  TableToolbar,
} from '../../common/components/ui';
import { useUrlPagedParams } from '../../hooks/useUrlParam';
import { useSupportAccessPermissions } from '../../common/support/useSupportAccessActions';
import { NewTicketModal } from '../../features/chat/components/NewTicketModal';
import { TicketBadges } from '../../features/chat/components/TicketCards';
import { companyTicketHref } from '../../features/chat/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { GROUP_OPTIONS, groupLabel, isGroup } from '../../features/chat/ticketGroups';
import type { TicketSummary } from '../../services/api/types';
import { useCompanyTickets } from '../../services/queries/supportChat';
import { formatDateTime } from '../../utils/format';
import { notify } from '../../utils/notifications';

const FILTERS = { group: 'all', q: '' };

const Unread = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
      {count}
      <span className="sr-only"> sin leer</span>
    </span>
  ) : null;

/** Pestaña «Tickets» de la ayuda: los tickets de la empresa, los movidos más recientemente primero. */
export const CompanyTicketsPanel = () => {
  const navigate = useNavigate();
  const { canManage } = useSupportAccessPermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams<keyof typeof FILTERS>(FILTERS, 10);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(filters.q, 300).trim();
  const group = isGroup(filters.group) ? filters.group : 'all';
  const { data, isPending, isFetching, error, refetch } = useCompanyTickets({
    group,
    q: q || undefined,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const rows = useMemo(() => data?.items ?? [], [data]);
  const chips = [
    ...(group !== 'all' ? [{ key: 'group', label: `Estado: ${groupLabel(group)}` }] : []),
    ...(filters.q ? [{ key: 'q', label: `Búsqueda: "${filters.q}"` }] : []),
  ];
  const open = (ticket: TicketSummary) => navigate(companyTicketHref(ticket.id));

  const columns: GridColDef<TicketSummary>[] = [
    {
      field: 'subject',
      headerName: 'Ticket',
      flex: 1.5,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.subject} subtitle={row.lastMessage?.preview ?? row.number} avatarName={row.number} />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 220,
      sortable: false,
      renderCell: ({ row }) => <TicketBadges ticket={row} />,
    },
    {
      field: 'updatedAt',
      headerName: 'Última actividad',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.updatedAt),
    },
    {
      field: 'unreadCount',
      headerName: '',
      width: 70,
      sortable: false,
      renderCell: ({ row }) => <Unread count={row.unreadCount} />,
    },
  ];

  return (
    <div className="grid gap-3">
      <TableToolbar
        filters={
          <>
            <Select
              label="Estado"
              value={group}
              onChange={(event) => setFilters({ group: event.target.value })}
              options={GROUP_OPTIONS}
            />
            {canManage && (
              <div className="flex items-end">
                <Button icon={<Plus />} onClick={() => setCreating(true)}>
                  Nuevo ticket
                </Button>
              </div>
            )}
          </>
        }
        search={{
          label: 'Buscar',
          placeholder: 'Número (T-000123) o asunto',
          value: filters.q,
          onChange: (value) => setFilters({ q: value }),
        }}
        chips={chips}
        onRemoveChip={(key) => setFilters({ [key]: key === 'group' ? 'all' : '' })}
        onClearChips={() => setFilters({ group: 'all', q: '' })}
        resultCount={data?.total}
        noun={['ticket', 'tickets']}
      />
      {error ? (
        <ErrorState error={error} resource="Los tickets" onRetry={() => void refetch()} />
      ) : (
        <ResponsiveTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          label="tickets"
          renderCard={(row) => (
            <button
              type="button"
              onClick={() => open(row)}
              className="grid w-full gap-1.5 text-left"
              aria-label={`Ver el ticket ${row.number}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-ink">{row.subject}</span>
                <Unread count={row.unreadCount} />
              </span>
              <TicketBadges ticket={row} />
              <span className="text-xs text-muted">
                {row.number} · {formatDateTime(row.updatedAt)}
              </span>
            </button>
          )}
          loading={isPending || isFetching}
          pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
          onRowClick={open}
          empty={
            <EmptyState
              title={chips.length > 0 ? 'Sin resultados' : 'Sin tickets'}
              illustration={chips.length > 0 ? 'search' : undefined}
              description={
                chips.length > 0
                  ? 'Ningún ticket cumple esos filtros.'
                  : 'Abrí uno para lo que necesite seguimiento, o desde el chat eligiendo los mensajes.'
              }
            />
          }
        />
      )}
      <NewTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        side="company"
        onCreated={(ticket) => {
          setCreating(false);
          notify.success(`Ticket ${ticket.number} abierto`);
          open(ticket);
        }}
      />
    </div>
  );
};
