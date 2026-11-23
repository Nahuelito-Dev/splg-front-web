import {
  Badge,
  Card,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageContainer,
  PageHeader,
  ResponsiveTable,
  TableToolbar,
  type TableColumn,
} from '../../common/components/ui';
import { useUrlPagedParams } from '../../hooks';
import type { ActivityItem } from '../../services/api/types';
import { usePlatformActivity } from '../../services/queries/platformConsole';
import { formatDateTime, formatDay } from '../../utils/format';
import { AUDIT_RESULT, labelOf } from '../../utils/statusLabels';
import { roleLabel } from '../Users/roleLabel';
import { activityAction, activityArea } from './activityLabels';
import { AccountPicker } from './components/AccountPicker';
import { CompanySelect } from './components/CompanySelect';

/** `actorName` sólo viaja para el chip: el filtro es el id que se eligió en el selector. */
const FILTERS = { from: '', to: '', company: '', actor: '', actorName: '' };
type Filters = typeof FILTERS;

/** Qué se hizo y en qué área, en castellano (nunca la ruta cruda de la API). */
const whatOf = (row: ActivityItem) => {
  const title = activityAction(row);
  const area = activityArea(row);
  // Si la acción ya nombra el área («Modificó · Garrafas»), no se repite abajo.
  return { title, detail: title.includes(area) ? undefined : area };
};

/** Las cuentas cuya foto la plataforma puede volver a pedir (`GET /users/:id/photo`); las demás no se renuevan. */
const RENEWABLE_ROLES = new Set(['super_admin', 'admin']);

/** Quién lo hizo, con su foto (`actorPhotoUrl` firmada de la API); sin foto, sus iniciales. */
const Who = ({ row }: { row: ActivityItem }) => (
  <IdentityCell
    title={row.actorName ?? 'Sistema'}
    subtitle={row.actorRole ? roleLabel(row.actorRole).text : undefined}
    avatarName={row.actorName ?? undefined}
    photo={
      row.actorUserId && row.actorName
        ? {
            kind: 'user',
            id: row.actorUserId,
            url: row.actorPhotoUrl,
            renewable: RENEWABLE_ROLES.has(row.actorRole ?? ''),
          }
        : undefined
    }
  />
);

const Result = ({ row }: { row: ActivityItem }) => (
  <span className="inline-flex items-center gap-1.5">
    <Badge label={labelOf(AUDIT_RESULT, row.result)} />
    <span className="font-mono text-xs text-muted">{row.statusCode}</span>
  </span>
);

const columns: TableColumn<ActivityItem>[] = [
  {
    field: 'at',
    kind: 'date',
    headerName: 'Cuándo',
    width: 170,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.at),
  },
  {
    field: 'actor',
    headerName: 'Quién',
    flex: 1,
    minWidth: 180,
    sortable: false,
    renderCell: ({ row }) => <Who row={row} />,
  },
  {
    field: 'what',
    headerName: 'Qué',
    flex: 1.4,
    minWidth: 240,
    sortable: false,
    renderCell: ({ row }) => {
      const what = whatOf(row);
      return (
        <div className="min-w-0 leading-tight">
          <span className="block truncate font-semibold text-ink">{what.title}</span>
          {what.detail && <span className="block truncate text-[11.5px] text-muted">{what.detail}</span>}
        </div>
      );
    },
  },
  {
    field: 'distributorName',
    headerName: 'Empresa',
    flex: 0.9,
    minWidth: 150,
    sortable: false,
    valueGetter: ({ row }) => row.distributorName ?? '—',
  },
  {
    field: 'result',
    headerName: 'Resultado',
    width: 150,
    sortable: false,
    renderCell: ({ row }) => <Result row={row} />,
  },
];

const ActivityCard = (row: ActivityItem) => {
  const what = whatOf(row);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Who row={row} />
        <Result row={row} />
      </div>
      <p className="text-sm font-medium text-ink">{what.title}</p>
      {what.detail && <p className="text-xs text-muted">{what.detail}</p>}
      <p className="text-xs text-muted">
        {formatDateTime(row.at)}
        {row.distributorName && ` · ${row.distributorName}`}
      </p>
    </div>
  );
};

const chipsOf = (filters: Filters) => {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (filters.from) chips.push({ key: 'from', label: `Desde ${formatDay(filters.from)}` });
  if (filters.to) chips.push({ key: 'to', label: `Hasta ${formatDay(filters.to)}` });
  if (filters.company) chips.push({ key: 'company', label: 'Una empresa' });
  if (filters.actor) chips.push({ key: 'actor', label: filters.actorName || 'Una persona' });
  return chips;
};

/**
 * Auditoría de la plataforma (`GET /v2/platform/activity`): lo que hicieron los administradores generales, lo que se
 * hizo sobre las empresas, el soporte y los roles, y los ingresos al panel. Sin los datos de las personas.
 */
export const PlatformActivity = () => {
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams<keyof Filters>(FILTERS, 25);
  const { data, isPending, isFetching, error, refetch } = usePlatformActivity({
    from: filters.from,
    to: filters.to,
    distributorId: filters.company,
    actorUserId: filters.actor,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const chips = chipsOf(filters);

  return (
    <PageContainer stack>
      <PageHeader
        title="Auditoría de plataforma"
        description="Lo que hace la gente de la plataforma y lo que cambia en las empresas, el soporte y los roles. No se muestran los datos cambiados ni los mensajes de error."
      />
      <Card>
        <TableToolbar
          filters={
            <>
              <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => setFilters(range)} />
              <CompanySelect
                value={filters.company}
                onChange={(company) => setFilters({ company })}
                emptyLabel="Todas"
              />
              <div className="sm:w-72">
                <AccountPicker
                  label="Quién"
                  selected={null}
                  onSelect={(user) =>
                    setFilters({ actor: user?.user_id ?? '', actorName: user?.full_name ?? user?.email ?? '' })
                  }
                />
              </div>
            </>
          }
          chips={chips}
          onRemoveChip={(key) => setFilters(key === 'actor' ? { actor: '', actorName: '' } : { [key]: '' })}
          onClearChips={() => setFilters(FILTERS)}
          resultCount={data?.total}
          noun={['registro', 'registros']}
        />
        {error ? (
          <ErrorState error={error} resource="La auditoría" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            rows={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            renderCard={ActivityCard}
            label="registros"
            loading={isPending || isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              <EmptyState
                title={chips.length > 0 ? 'Sin resultados' : 'Sin actividad'}
                description={
                  chips.length > 0 ? 'Nada cumple esos filtros.' : 'Todavía no hay registros de la plataforma.'
                }
              />
            }
          />
        )}
      </Card>
    </PageContainer>
  );
};
