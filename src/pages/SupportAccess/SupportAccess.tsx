import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IdentityCell,
  LoadingState,
  PageContainer,
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { useRevokeWithConfirm, useSupportAccessPermissions } from '../../common/support/useSupportAccessActions';
import { useUrlParam } from '../../hooks';
import type { SupportSession } from '../../services/api/types';
import {
  useActiveSupportAccess,
  usePlatform,
  useSupportAccess,
  useSupportAccessList,
} from '../../services/queries/supportSessions';
import { formatDateTime, formatTime } from '../../utils/format';
import { labelOf, SUPPORT_SESSION_STATUS } from '../../utils/statusLabels';
import { PendingRequestCard } from './components/PendingRequestCard';
import { SupportPolicyCard } from './components/SupportPolicyCard';
import { SupportSessionDrawer } from './components/SupportSessionDrawer';

const PENDING_PAGE = { page: 0, pageSize: 20 };

/**
 * «Accesos de soporte» del admin de la empresa (§4.12): los pedidos pendientes para aprobar o rechazar, la sesión
 * activa para revocar, el historial con lo que miró el soporte y la política. Ver: `soporte.ver`; decidir y revocar:
 * `soporte.gestionar`. El enlace del aviso y del correo llega con `?session=<id>`.
 */
export const SupportAccess = () => {
  const { canView, canManage, isPending: loadingPermissions } = useSupportAccessPermissions();
  const { data: platform } = usePlatform();
  const [sessionParam, setSessionParam] = useUrlParam('session', '');
  const [opened, setOpened] = useState<SupportSession | null>(null);
  const [history, setHistory] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const pending = useSupportAccessList(PENDING_PAGE, 'pending', canView);
  const active = useActiveSupportAccess(canView);
  const all = useSupportAccessList(history, undefined, canView);
  const revoke = useRevokeWithConfirm();

  // La sesión que pide el enlace (aviso de la bandeja o correo), si está en lo que ya se cargó.
  const linked = useMemo(() => {
    if (!sessionParam) return null;
    const pools = [pending.data?.rows, active.data?.rows, all.data?.rows];
    return pools.flatMap((rows) => rows ?? []).find((s) => s.id === sessionParam) ?? null;
  }, [sessionParam, pending.data, active.data, all.data]);
  const linkedDetail = useSupportAccess(canView && sessionParam && !linked ? sessionParam : undefined);
  const shown = opened ?? linked ?? linkedDetail.data ?? null;
  const close = () => {
    setOpened(null);
    if (sessionParam) setSessionParam('');
  };

  const columns = useMemo<GridColDef<SupportSession>[]>(
    () => [
      {
        field: 'requestedBy',
        headerName: 'Soporte',
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.requestedBy.fullName ?? 'Soporte'}
            subtitle={row.reason}
            avatarName={row.requestedBy.fullName ?? 'S'}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 140,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(SUPPORT_SESSION_STATUS, row.status)} variant="critical" />,
      },
      {
        field: 'createdAt',
        headerName: 'Pedido',
        width: 170,
        sortable: false,
        valueFormatter: ({ value }) => formatDateTime(value as string),
      },
      {
        field: 'kind',
        headerName: 'Tipo',
        width: 120,
        sortable: false,
        valueFormatter: ({ value }) => (value === 'emergency' ? 'Emergencia' : 'Con aprobación'),
      },
    ],
    [],
  );

  if (loadingPermissions) return <LoadingState fullPage />;
  if (!canView) {
    return (
      <PageContainer>
        <EmptyState
          title="Sin permiso"
          description="Tu rol no puede ver los accesos de soporte. Pedíselo a un administrador de tu empresa."
        />
      </PageContainer>
    );
  }

  const activeSession = active.data?.rows[0];
  const pendingRows = pending.data?.rows ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Accesos de soporte"
        description={`Cuándo y para qué el soporte${platform ? ` de ${platform.name}` : ''} pidió mirar tu empresa, qué miró y quién lo aprobó. Siempre es sólo lectura.`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <section aria-labelledby="support-active" className="grid gap-3">
            <h2 id="support-active" className="text-base font-semibold text-ink">
              Activa
            </h2>
            {active.isPending ? (
              <LoadingState />
            ) : active.error ? (
              <ErrorState error={active.error} resource="La sesión activa" onRetry={() => void active.refetch()} />
            ) : activeSession ? (
              <Card className="flex flex-wrap items-center justify-between gap-3 border-warn/30 bg-warn-soft p-4 text-warn">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {activeSession.requestedBy.fullName ?? 'El soporte'} tiene acceso de lectura
                    {activeSession.expiresAt ? ` hasta las ${formatTime(activeSession.expiresAt)}` : ''}
                    {activeSession.kind === 'emergency' ? ' (emergencia)' : ''}
                  </p>
                  <p className="truncate text-sm">{activeSession.reason}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpened(activeSession)}>
                    Ver qué miró
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={revoke.isPending}
                    onClick={() => void revoke.run(activeSession)}
                    blockedReason={canManage ? undefined : 'Necesitás el permiso para gestionar los accesos de soporte'}
                  >
                    Revocar
                  </Button>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-muted">Nadie del soporte tiene acceso ahora.</p>
            )}
          </section>

          <section aria-labelledby="support-pending" className="grid gap-3">
            <h2 id="support-pending" className="text-base font-semibold text-ink">
              Pendientes
            </h2>
            {pending.isPending ? (
              <LoadingState />
            ) : pending.error ? (
              <ErrorState error={pending.error} resource="Los pedidos" onRetry={() => void pending.refetch()} />
            ) : pendingRows.length === 0 ? (
              <p className="text-sm text-muted">No hay pedidos esperando tu respuesta.</p>
            ) : (
              pendingRows.map((session) => (
                <PendingRequestCard
                  key={session.id}
                  session={session}
                  canManage={canManage}
                  platformName={platform?.name}
                  onOpen={setOpened}
                />
              ))
            )}
          </section>

          <Card>
            <CardHeader title="Historial" className="px-5 pt-5" />
            {all.error ? (
              <ErrorState error={all.error} resource="El historial" onRetry={() => void all.refetch()} />
            ) : (
              <ResponsiveTable
                rows={all.data?.rows ?? []}
                columns={columns}
                getRowId={(row) => row.id}
                label="el historial"
                renderCard={(row) => (
                  <button
                    type="button"
                    onClick={() => setOpened(row)}
                    className="grid w-full gap-1 border-b border-outline px-4 py-3 text-left hover:bg-surface-hover"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-ink">{row.requestedBy.fullName ?? 'Soporte'}</span>
                      <Badge label={labelOf(SUPPORT_SESSION_STATUS, row.status)} variant="critical" />
                    </span>
                    <span className="line-clamp-2 text-sm text-ink-2">{row.reason}</span>
                    <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>
                  </button>
                )}
                loading={all.isFetching}
                pagination={{ model: history, onChange: setHistory, total: all.data?.total ?? 0 }}
                onRowClick={setOpened}
                empty={<EmptyState title="Sin accesos" description="El soporte nunca pidió entrar a tu empresa." />}
              />
            )}
          </Card>
        </div>
        <div className="min-w-0">
          <SupportPolicyCard canManage={canManage} />
        </div>
      </div>
      <SupportSessionDrawer session={shown} onClose={close} />
    </PageContainer>
  );
};
