import { useMemo } from 'react';
import { usePermissions } from '../../../hooks';
import { TableroTimeline, TableroWidget } from '../../../common/components/ui';
import { useClaims } from '../../../services/queries/claims';
import { useFleetExpirations } from '../../../services/queries/fleet';
import { useOrders } from '../../../services/queries/orders';
import { buildActivity } from '../lib/activity';
import { formatRelative } from '../lib/relativeTime';

const RECENT = { page: 0, pageSize: 20 };
const EXPIRATION_HORIZON_DAYS = 15;

/**
 * Actividad reciente: pedidos creados, aceptados y entregados (GET /orders),
 * reclamos nuevos (GET /claims) y vencimientos de flota (GET /fleet/expirations).
 */
export const ActivityCard = () => {
  const orders = useOrders(RECENT, {}, { refetchInterval: 30_000 });
  const claims = useClaims({ refetchInterval: 30_000 });
  const { needsDistributor } = usePermissions();
  // La API pide una distribuidora elegida para los vencimientos de flota.
  const expirations = useFleetExpirations(EXPIRATION_HORIZON_DAYS, !needsDistributor);

  const now = Date.now();
  const events = useMemo(
    () =>
      buildActivity({
        orders: orders.data?.orders ?? [],
        claims: claims.data ?? [],
        expirations: expirations.data,
        now: Date.now(),
      }),
    [orders.data, claims.data, expirations.data],
  );

  const error = orders.error ?? claims.error;

  return (
    <TableroWidget
      title="Actividad reciente"
      subtitle={
        needsDistributor
          ? 'Sin vencimientos de flota: elegí una distribuidora con «Ver como».'
          : `Movimientos de los últimos ${RECENT.pageSize} pedidos, reclamos y vencimientos de flota.`
      }
      loading={orders.isLoading || claims.isLoading}
      error={error}
      onRetry={() => {
        void orders.refetch();
        void claims.refetch();
      }}
      empty={
        events.length === 0
          ? { title: 'Sin actividad todavía', description: 'Los pedidos y reclamos nuevos aparecen acá.' }
          : null
      }
    >
      <TableroTimeline
        items={events.map((event) => ({
          id: event.id,
          icon: event.icon,
          tone: event.tone,
          title: event.title,
          detail: event.detail,
          time: formatRelative(event.at, now),
          to: event.to,
        }))}
      />
    </TableroWidget>
  );
};
