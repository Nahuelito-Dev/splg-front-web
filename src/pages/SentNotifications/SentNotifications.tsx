import type { GridPaginationModel } from '@mui/x-data-grid';
import {
  Card,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageContainer,
  PageHeader,
  Select,
  TableToolbar,
  type FilterChip,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import type { NotificationLogItem } from '../../services/api/types';
import { useNotificationLog } from '../../services/queries/notificationLog';
import { formatDay } from '../../utils/format';
import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE_OPTIONS,
  labelOf,
  notificationTypeLabel,
} from '../../utils/statusLabels';
import { SentNotificationDrawer } from './components/SentNotificationDrawer';
import { SentNotificationsTable } from './components/SentNotificationsTable';

const PAGE_SIZE = 10;

const CHANNELS: NotificationLogItem['channel'][] = ['push', 'email'];
const STATUSES: NotificationLogItem['status'][] = ['sent', 'failed', 'skipped'];

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'Todos los canales' },
  ...CHANNELS.map((channel) => ({ value: channel, label: labelOf(NOTIFICATION_CHANNEL, channel).text })),
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  ...STATUSES.map((status) => ({ value: status, label: labelOf(NOTIFICATION_STATUS, status).text })),
];
const TYPE_OPTIONS = [{ value: 'all', label: 'Todos los avisos' }, ...NOTIFICATION_TYPE_OPTIONS];

/**
 * Avisos enviados: el registro de cada notificación y correo que salió del sistema, con el destinatario enmascarado,
 * el resultado y el pedido al que se refiere. Sólo consulta.
 */
export const SentNotifications = () => {
  const { needsDistributor } = usePermissions();
  const [{ channel: channelParam, status: statusParam, type, from, to, q, page, id }, setFilters] = useUrlParams({
    channel: 'all',
    status: 'all',
    type: 'all',
    from: '',
    to: '',
    q: '',
    page: '1',
    id: '',
  });
  const channel = CHANNELS.find((c) => c === channelParam);
  const status = STATUSES.find((s) => s === statusParam);
  const typeFilter = type !== 'all' ? type : undefined;
  const term = useDebounce(q.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(page) - 1 || 0), pageSize: PAGE_SIZE };

  const { data, isLoading, isFetching, error, refetch } = useNotificationLog(
    {
      channel,
      status,
      type: typeFilter,
      from: from || undefined,
      to: to || undefined,
      term: term || undefined,
      limit: PAGE_SIZE,
      offset: pagination.page * PAGE_SIZE,
    },
    !needsDistributor,
  );
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  // El aviso abierto vive en la URL (`?id=<id>`): se puede compartir el enlace al detalle.
  const selected = rows.find((row) => row.notificationLogId === id) ?? null;

  const chips: FilterChip[] = [];
  if (channel) chips.push({ key: 'channel', name: 'Canal', label: labelOf(NOTIFICATION_CHANNEL, channel).text });
  if (status) chips.push({ key: 'status', name: 'Estado', label: labelOf(NOTIFICATION_STATUS, status).text });
  if (typeFilter) chips.push({ key: 'type', name: 'Aviso', label: notificationTypeLabel(typeFilter) });
  if (from || to)
    chips.push({
      key: 'dates',
      name: 'Fechas',
      label: `${from ? formatDay(from) : '…'} a ${to ? formatDay(to) : '…'}`,
    });
  if (q.trim()) chips.push({ key: 'q', label: `"${q.trim()}"` });
  const removeChip = (key: string) => {
    if (key === 'channel') setFilters({ channel: 'all', page: '1' });
    else if (key === 'status') setFilters({ status: 'all', page: '1' });
    else if (key === 'type') setFilters({ type: 'all', page: '1' });
    else if (key === 'dates') setFilters({ from: '', to: '', page: '1' });
    else setFilters({ q: '', page: '1' });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Avisos enviados"
        description="Las notificaciones y los correos que mandó el sistema, a quién y cómo terminaron. Los destinatarios se ven enmascarados."
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus avisos enviados."
          />
        </Card>
      ) : isLoading ? (
        <Card>
          <ListSkeleton />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} resource="Los avisos enviados" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <Card>
          <TableToolbar
            filters={
              <>
                <Select
                  label="Canal"
                  className="sm:w-48"
                  value={channel ?? 'all'}
                  options={CHANNEL_OPTIONS}
                  onChange={(e) => setFilters({ channel: e.target.value, page: '1' })}
                />
                <Select
                  label="Estado"
                  className="sm:w-48"
                  value={status ?? 'all'}
                  options={STATUS_OPTIONS}
                  onChange={(e) => setFilters({ status: e.target.value, page: '1' })}
                />
                <Select
                  label="Aviso"
                  className="sm:w-64"
                  value={typeFilter ?? 'all'}
                  options={TYPE_OPTIONS}
                  onChange={(e) => setFilters({ type: e.target.value, page: '1' })}
                />
                <DateRangeFilter
                  label="Fecha"
                  from={from}
                  to={to}
                  onChange={(range) => setFilters({ ...range, page: '1' })}
                />
              </>
            }
            search={{
              label: 'Buscar avisos',
              placeholder: 'Destinatario o asunto',
              value: q,
              onChange: (value) => setFilters({ q: value, page: '1' }),
            }}
            chips={chips}
            onRemoveChip={removeChip}
            onClearChips={() =>
              setFilters({ channel: 'all', status: 'all', type: 'all', from: '', to: '', q: '', page: '1' })
            }
            resultCount={total}
            noun={['aviso', 'avisos']}
          />
          <SentNotificationsTable
            rows={rows}
            total={total}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={(model) => setFilters({ page: String(model.page + 1) })}
            filtered={chips.length > 0}
            onView={(item) => setFilters({ id: item.notificationLogId })}
          />
        </Card>
      )}

      <SentNotificationDrawer item={selected} onClose={() => setFilters({ id: '' })} />
    </PageContainer>
  );
};
