import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, ErrorState, IdentityCell, ResponsiveTable } from '../../../common/components/ui';
import { useUrlParam } from '../../../hooks';
import type { RepurchaseForecastRow } from '../../../services/api/types';
import { useRepurchaseForecast } from '../../../services/queries/repurchase';
import { formatDate, formatNumber } from '../../../utils/format';
import { daysLeftText, DEFAULT_FORECAST_WINDOW, ESTIMATE_SOURCE, FORECAST_WINDOWS } from './repurchaseLabels';
import { RepurchaseCustomerLink } from './RepurchaseCustomerLink';

const unitsText = (units: number): string => `${units} ${units === 1 ? 'garrafa' : 'garrafas'}`;

const invitationLabel = (row: RepurchaseForecastRow) =>
  row.openInvitation
    ? ({ text: 'Invitación abierta', tone: 'info' } as const)
    : !row.noticeEnabled
      ? ({ text: 'Aviso desactivado', tone: 'neutral' } as const)
      : null;

/** Los clientes a los que se les acaba el gas dentro de la ventana elegida (CU-146), del más próximo al más lejano. */
export const RepurchaseForecastTab = () => {
  const [windowParam, setWindowParam] = useUrlParam('days', String(DEFAULT_FORECAST_WINDOW));
  const days = FORECAST_WINDOWS.find((d) => String(d) === windowParam) ?? DEFAULT_FORECAST_WINDOW;
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const { data, isFetching, error, refetch } = useRepurchaseForecast(pagination, days);

  const columns = useMemo<GridColDef<RepurchaseForecastRow>[]>(
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
        field: 'estimatedAt',
        headerName: 'Se le acaba',
        width: 170,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{formatDate(row.estimatedAt)}</span>
            <span className="block text-[11.5px] text-muted">{daysLeftText(row.daysLeft)}</span>
          </div>
        ),
      },
      {
        field: 'source',
        headerName: 'Se estimó con',
        width: 190,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{ESTIMATE_SOURCE[row.source]}</span>
            <span className="block text-[11.5px] text-muted">
              {row.source === 'history'
                ? `${row.ordersUsed} compras · ${formatNumber(row.estimatedKgPerMonth)} kg/mes`
                : `${formatNumber(row.declaredKgPerMonth)} kg/mes declarados`}
            </span>
          </div>
        ),
      },
      {
        field: 'lastPurchaseAt',
        headerName: 'Última compra',
        width: 170,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{formatDate(row.lastPurchaseAt)}</span>
            <span className="block text-[11.5px] text-muted">
              {unitsText(row.usualUnits)} · {formatNumber(row.lastPurchaseKg)} kg
            </span>
          </div>
        ),
      },
      {
        field: 'invitation',
        headerName: 'Aviso',
        width: 170,
        sortable: false,
        renderCell: ({ row }) => {
          const label = invitationLabel(row);
          return label ? (
            <Badge label={label} />
          ) : (
            <span className="text-[13px] text-muted">{`${row.noticeDays} d de anticipación`}</span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ventana de días">
        <span className="text-sm text-muted">Se les acaba el gas en los próximos</span>
        {FORECAST_WINDOWS.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={d === days ? 'primary' : 'secondary'}
            aria-pressed={d === days}
            onClick={() => {
              setPagination((p) => ({ ...p, page: 0 }));
              setWindowParam(String(d));
            }}
          >
            {d} días
          </Button>
        ))}
      </div>
      {error && !data ? (
        <ErrorState error={error} resource="Las próximas recompras" onRetry={() => void refetch()} />
      ) : (
        <ResponsiveTable
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.customer.userId}
          label="próximas recompras"
          loading={isFetching && !data}
          pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
          empty={
            <EmptyState
              title="Nadie se queda sin gas en esta ventana"
              description="Se proyecta a los clientes con compras de esta distribuidora y consumo estimable. Probá con una ventana más larga."
            />
          }
          renderCard={(row) => (
            <RepurchaseCustomerLink
              customer={row.customer}
              className="block w-full rounded-xl border border-outline p-3 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-ink">{row.customer.fullName ?? 'Sin nombre'}</span>
                <span className="text-xs text-muted">{daysLeftText(row.daysLeft)}</span>
              </div>
              <p className="text-xs text-muted">
                {formatDate(row.estimatedAt)} · {ESTIMATE_SOURCE[row.source]}
              </p>
              <p className="text-xs text-muted">
                Última compra {formatDate(row.lastPurchaseAt)} · {unitsText(row.usualUnits)}
              </p>
              {invitationLabel(row) && (
                <div className="mt-1.5">
                  <Badge label={invitationLabel(row) as NonNullable<ReturnType<typeof invitationLabel>>} />
                </div>
              )}
            </RepurchaseCustomerLink>
          )}
        />
      )}
    </div>
  );
};
