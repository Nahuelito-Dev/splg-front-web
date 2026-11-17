import type { GridColDef } from '@mui/x-data-grid';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageContainer,
  PageHeader,
  ResponsiveTable,
  Select,
  TableToolbar,
  Tabs,
} from '../../../common/components/ui';
import { useDebounce } from '../../../hooks/useDebounce';
import { useUrlPagedParams } from '../../../hooks/useUrlParam';
import { NewTicketModal } from '../../../features/chat/components/NewTicketModal';
import { FirstResponseDue } from '../../../features/chat/components/TicketParts';
import { TicketBadges } from '../../../features/chat/components/TicketCards';
import { platformTicketHref } from '../../../features/chat/routes';
import type { PlatformTicketsByQuery, TicketPriority } from '../../../services/api/supportChat';
import type { Ticket } from '../../../services/api/types';
import { usePlatformTickets } from '../../../services/queries/supportChat';
import { notify } from '../../../utils/notifications';
import { statusOptions, TICKET_PRIORITY } from '../../../utils/statusLabels';
import { CompanySelect } from '../components/CompanySelect';

type QueueTab = 'active' | 'new' | 'mine' | 'waiting' | 'resolved' | 'closed' | 'all';

/**
 * Cada pestaña es un filtro de la API. «Activos» junta nuevos, en curso y esperando a la empresa; los resueltos y
 * cerrados se siguen viendo (auditoría).
 */
const TAB_QUERY: Record<QueueTab, Pick<PlatformTicketsByQuery, 'group' | 'assigned'>> = {
  active: { group: 'active' },
  new: { group: 'new' },
  mine: { group: 'active', assigned: 'me' },
  waiting: { group: 'waiting_company' },
  resolved: { group: 'resolved' },
  closed: { group: 'closed' },
  all: { group: 'all' },
};
const isTab = (value: string): value is QueueTab => value in TAB_QUERY;
const isPriority = (value: string): value is TicketPriority => value in TICKET_PRIORITY;

const FILTERS = { tab: 'active', company: '', priority: '', overdue: '', q: '' };
const PRIORITY_OPTIONS = [{ value: '', label: 'Todas' }, ...statusOptions(TICKET_PRIORITY)];

/**
 * «Tickets» de la plataforma (§15.1): la cola de todas las empresas, con pestañas Nuevos / Míos / Esperando empresa /
 * Resueltos / Todos y filtros por empresa, prioridad, vencidos y búsqueda por número o asunto.
 */
export const PlatformTickets = () => {
  const navigate = useNavigate();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams<keyof typeof FILTERS>(FILTERS, 25);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(filters.q, 300).trim();
  const tab: QueueTab = isTab(filters.tab) ? filters.tab : 'active';
  const { data, isPending, isFetching, error, refetch } = usePlatformTickets({
    ...TAB_QUERY[tab],
    distributorId: filters.company || undefined,
    priority: isPriority(filters.priority) ? filters.priority : undefined,
    overdue: filters.overdue === '1' ? true : undefined,
    q: q || undefined,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const rows = useMemo(() => data?.items ?? [], [data]);
  const open = (ticket: Ticket) => navigate(platformTicketHref(ticket.id));
  const counts = data?.counts;

  const chips = [
    ...(filters.company ? [{ key: 'company', label: 'Una empresa' }] : []),
    ...(isPriority(filters.priority)
      ? [{ key: 'priority', label: `Prioridad: ${TICKET_PRIORITY[filters.priority].text}` }]
      : []),
    ...(filters.overdue === '1' ? [{ key: 'overdue', label: 'Vencidos' }] : []),
    ...(filters.q ? [{ key: 'q', label: `Búsqueda: "${filters.q}"` }] : []),
  ];

  const columns: GridColDef<Ticket>[] = [
    {
      field: 'subject',
      headerName: 'Ticket',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.subject}
          subtitle={`${row.number} · ${row.distributorName}`}
          avatarName={row.distributorName}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 230,
      sortable: false,
      renderCell: ({ row }) => <TicketBadges ticket={row} />,
    },
    {
      field: 'firstResponseDueAt',
      headerName: 'Primera respuesta',
      width: 210,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="text-sm">
          <FirstResponseDue ticket={row} />
        </span>
      ),
    },
    {
      field: 'assignedTo',
      headerName: 'Asignado',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => row.assignedTo?.fullName ?? 'Sin asignar',
    },
    {
      field: 'unreadCount',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) =>
        row.unreadCount > 0 ? (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
            {row.unreadCount}
            <span className="sr-only"> sin leer</span>
          </span>
        ) : null,
    },
  ];

  return (
    <PageContainer stack>
      <PageHeader
        title="Tickets"
        description="Lo que necesita seguimiento, de todas las empresas. Los nuevos esperan que alguien los tome."
        actions={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            Nuevo ticket
          </Button>
        }
      />
      <Tabs
        label="Cola de tickets"
        idPrefix="platform-tickets"
        value={tab}
        onChange={(id) => setFilters({ tab: id })}
        items={[
          { id: 'active', label: 'Activos' },
          { id: 'new', label: 'Nuevos', count: counts ? counts.new : null, tone: 'info' },
          { id: 'mine', label: 'Míos', count: counts ? counts.mine : null },
          { id: 'waiting', label: 'Esperando empresa', count: counts ? counts.waitingCompany : null, tone: 'warn' },
          { id: 'resolved', label: 'Resueltos' },
          { id: 'closed', label: 'Cerrados' },
          { id: 'all', label: 'Todos' },
        ]}
      />
      <Card>
        <TableToolbar
          filters={
            <>
              <CompanySelect
                value={filters.company}
                onChange={(company) => setFilters({ company })}
                emptyLabel="Todas"
              />
              <Select
                label="Prioridad"
                value={filters.priority}
                onChange={(event) => setFilters({ priority: event.target.value })}
                options={PRIORITY_OPTIONS}
              />
              <Checkbox
                label={`Sólo vencidos (${counts ? counts.overdue : '—'})`}
                checked={filters.overdue === '1'}
                onChange={(event) => setFilters({ overdue: event.target.checked ? '1' : '' })}
              />
            </>
          }
          search={{
            label: 'Buscar',
            placeholder: 'Número (T-000123) o asunto',
            value: filters.q,
            onChange: (value) => setFilters({ q: value }),
          }}
          chips={chips}
          onRemoveChip={(key) => setFilters({ [key]: '' })}
          onClearChips={() => setFilters({ company: '', priority: '', overdue: '', q: '' })}
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
                <span className="min-w-0 truncate font-medium text-ink">{row.subject}</span>
                <TicketBadges ticket={row} />
                <span className="text-xs text-muted">
                  {row.number} · {row.distributorName} · {row.assignedTo?.fullName ?? 'Sin asignar'}
                </span>
                <span className="text-xs">
                  <FirstResponseDue ticket={row} />
                </span>
              </button>
            )}
            loading={isPending || isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={open}
            empty={
              <EmptyState
                title={chips.length > 0 ? 'Sin resultados' : 'No hay tickets acá'}
                description={chips.length > 0 ? 'Ningún ticket cumple esos filtros.' : 'Probá con otra pestaña.'}
                illustration={chips.length > 0 ? 'search' : undefined}
              />
            }
          />
        )}
      </Card>
      <NewTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        side="platform"
        renderCompany={(value, onChange) => <CompanySelect value={value} onChange={onChange} />}
        onCreated={(ticket) => {
          setCreating(false);
          notify.success(`Ticket ${ticket.number} abierto`);
          open(ticket);
        }}
      />
    </PageContainer>
  );
};
