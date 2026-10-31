import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  IdentityCell,
  ResponsiveTable,
  StatusFilterTabs,
  type StatusOption,
} from '../../../common/components/ui';
import { z } from 'zod';
import { useUrlParam } from '../../../hooks';
import type { AdminInvitation, RepurchaseStats } from '../../../services/api/types';
import { useRepurchaseInvitations } from '../../../services/queries/repurchase';
import { argentinaDay, formatDate, formatDateTime } from '../../../utils/format';
import { INVITATION_STATUS } from './repurchaseLabels';
import { RepurchaseCustomerLink } from './RepurchaseCustomerLink';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Abiertas', tone: 'info' },
  { value: 'accepted', label: 'Aceptadas', tone: 'success' },
  { value: 'rejected', label: 'Descartadas', tone: 'neutral' },
  { value: 'expired', label: 'Vencidas', tone: 'warn' },
  { value: 'cancelled', label: 'Compró por su cuenta', tone: 'neutral' },
];

const STATUS_PARAM = z.enum(['', ...STATUS_OPTIONS.map((o) => o.value)] as [string, ...string[]]);

const unitsText = (units: number): string => `${units} ${units === 1 ? 'garrafa' : 'garrafas'}`;

const responseText = (row: AdminInvitation): string =>
  row.respondedAt ? formatDateTime(row.respondedAt) : `Vence ${formatDateTime(row.expiresAt)}`;

/** Las invitaciones que el sistema emitió y cómo terminó cada una (CU-106). */
export const RepurchaseInvitationsTab = ({ stats }: { stats: RepurchaseStats | undefined }) => {
  const [statusParam, setStatus] = useUrlParam('status', '');
  // El estado viene de la URL: sólo vale uno de los conocidos, cualquier otro es «todas».
  const status = STATUS_PARAM.catch('').parse(statusParam);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  // La lista y los contadores miran el mismo período (el de las estadísticas); sin ellas, todo.
  const periodEnd = stats ? new Date(new Date(stats.to).getTime() - 1) : null;
  const range = stats && periodEnd ? { from: argentinaDay(stats.from), to: argentinaDay(periodEnd) } : {};
  const filters = { ...range, ...(status ? { status: status as AdminInvitation['status'] } : {}) };
  const { data, isFetching, error, refetch } = useRepurchaseInvitations(pagination, filters);
  const counts: Record<string, number | null> = {
    all: stats?.sent ?? null,
    pending: stats?.pending ?? null,
    accepted: stats?.accepted ?? null,
    rejected: stats?.rejected ?? null,
    expired: stats?.expired ?? null,
    cancelled: stats?.cancelled ?? null,
  };

  const columns = useMemo<GridColDef<AdminInvitation>[]>(
    () => [
      {
        field: 'customer',
        headerName: 'Cliente',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <RepurchaseCustomerLink customer={row.customer} className="min-w-0 hover:underline">
            <IdentityCell
              title={row.customer.fullName ?? 'Sin nombre'}
              subtitle={row.customer.phoneNumber ?? row.customer.email ?? undefined}
              avatarName={row.customer.fullName ?? undefined}
            />
          </RepurchaseCustomerLink>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 190,
        renderCell: ({ row }) => <Badge label={INVITATION_STATUS[row.status]} />,
      },
      {
        field: 'projectedDepletionAt',
        headerName: 'Se le acababa',
        width: 150,
        renderCell: ({ row }) => formatDate(row.projectedDepletionAt),
      },
      {
        field: 'totalUnits',
        headerName: 'Se le ofreció',
        width: 130,
        renderCell: ({ row }) => unitsText(row.totalUnits),
      },
      {
        field: 'createdAt',
        headerName: 'Emitida',
        width: 200,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{formatDateTime(row.createdAt)}</span>
            <span className="block text-[11.5px] text-muted">{responseText(row)}</span>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <StatusFilterTabs
      options={STATUS_OPTIONS}
      value={status}
      onChange={(value) => {
        setPagination((p) => ({ ...p, page: 0 }));
        setStatus(value);
      }}
      counts={counts}
      label="Estado de las invitaciones"
      idPrefix="repurchase-invitations"
      allLabel="Todas"
    >
      {stats && periodEnd && (
        <p className="mb-3 text-[13px] text-muted">
          Invitaciones emitidas del {formatDate(stats.from)} al {formatDate(periodEnd.toISOString())}.
        </p>
      )}
      {error && !data ? (
        <ErrorState error={error} resource="Las invitaciones" onRetry={() => void refetch()} />
      ) : (
        <ResponsiveTable
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.invitationId}
          label="invitaciones de recompra"
          loading={isFetching && !data}
          pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
          empty={
            <EmptyState
              title="No hay invitaciones"
              description="El proceso diario invita a los clientes a los que se les acaba el gas dentro de su aviso."
            />
          }
          renderCard={(row) => (
            <RepurchaseCustomerLink
              customer={row.customer}
              className="block w-full rounded-xl border border-outline p-3 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-ink">{row.customer.fullName ?? 'Sin nombre'}</span>
                <Badge label={INVITATION_STATUS[row.status]} />
              </div>
              <p className="text-xs text-muted">
                {unitsText(row.totalUnits)} · se le acababa el {formatDate(row.projectedDepletionAt)}
              </p>
              <p className="text-xs text-muted">Emitida {formatDateTime(row.createdAt)}</p>
              <p className="text-xs text-muted">{responseText(row)}</p>
            </RepurchaseCustomerLink>
          )}
        />
      )}
    </StatusFilterTabs>
  );
};
