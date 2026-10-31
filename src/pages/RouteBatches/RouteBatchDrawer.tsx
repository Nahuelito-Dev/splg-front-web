import { Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, DetailList, RecordDrawer } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useDissolveRouteBatch, useRouteBatch } from '../../services/queries/routeBatches';
import { formatDateTime, formatDay, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import {
  CLOSE_REASON,
  ROUTE_BATCH_STATUS,
  canDissolve,
  formatEta,
  formatKg,
  formatSlot,
  isWithdrawn,
  offerLabel,
  routePoints,
  stopCountOf,
} from './routeBatchLabels';
import { RouteBatchMap } from './RouteBatchMap';

interface Props {
  batchId: string | null;
  onClose: () => void;
}

/** El detalle de un lote: el recorrido en orden con su mapa, a quién se ofreció y la decisión de deshacerlo. */
export const RouteBatchDrawer = ({ batchId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const detail = useRouteBatch(batchId ?? undefined);
  const dissolve = useDissolveRouteBatch();
  const batch = detail.data;
  const points = batch ? routePoints(batch) : [];
  const stops = batch ? [...batch.stops].sort((a, b) => a.sequence - b.sequence) : [];

  const handleDissolve = async () => {
    if (!batch) return;
    const ok = await confirm({
      title: '¿Deshacer el lote?',
      text: 'Se cierra la oferta al chofer y los pedidos vuelven a quedar libres para el despacho: no se vuelven a agrupar solos y el despacho individual los toma cuando corresponda.',
      confirmText: 'Deshacer lote',
      danger: true,
    });
    if (!ok) return;
    dissolve.mutate(batch.batchId, {
      onSuccess: () => notify.success('Lote deshecho: los pedidos quedaron libres para el despacho'),
      onError: notify.error,
    });
  };

  return (
    <RecordDrawer
      open={batchId !== null}
      onClose={onClose}
      size="lg"
      title={batch ? `Recorrido ${formatShortId(batch.batchId)}` : 'Recorrido'}
      description={batch ? `Armado el ${formatDateTime(batch.createdAt)}` : undefined}
      badges={batch && <Badge label={ROUTE_BATCH_STATUS[batch.status]} />}
      loading={detail.isPending && batchId !== null}
      error={detail.error}
      onRetry={() => void detail.refetch()}
      resource="El recorrido"
      footer={
        batch && canDissolve(batch.status) ? (
          <Button
            variant="ghost"
            icon={<Ban />}
            disabled={!canWrite || dissolve.isPending}
            title={writeHint}
            onClick={() => void handleDissolve()}
          >
            Deshacer lote
          </Button>
        ) : undefined
      }
    >
      {batch && (
        <div className="space-y-6">
          {batch.status === 'offered' && batch.currentOffer && (
            <p role="status" className="rounded-xl border border-info/30 bg-info-soft p-3 text-sm text-info">
              Esperando la respuesta de {batch.currentOffer.driverName ?? 'un chofer'} hasta el{' '}
              {formatDateTime(batch.currentOffer.expiresAt)}
            </p>
          )}
          {batch.status === 'dissolved' && batch.closeReason && (
            <p role="status" className="rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              {CLOSE_REASON[batch.closeReason]}
            </p>
          )}
          <DetailList
            items={[
              { label: 'Peso total', value: formatKg(batch.totalWeightKg) },
              { label: 'Paradas', value: String(stopCountOf(batch)) },
              { label: 'Chofer', value: batch.driver?.name ?? 'Todavía sin chofer' },
              {
                label: batch.closedAt ? 'Cerrado' : 'Estado',
                value: batch.closedAt ? formatDateTime(batch.closedAt) : ROUTE_BATCH_STATUS[batch.status].text,
              },
            ]}
          />
          {points.length > 0 && (
            <section aria-labelledby="batch-map">
              <h3 id="batch-map" className="mb-2 text-sm font-semibold text-ink">
                Recorrido
              </h3>
              <RouteBatchMap points={points} label={`Mapa del recorrido con ${points.length} paradas`} />
            </section>
          )}
          <section aria-labelledby="batch-stops">
            <h3 id="batch-stops" className="mb-2 text-sm font-semibold text-ink">
              Paradas en orden de entrega
            </h3>
            <ol className="space-y-2">
              {stops.map((s) => (
                <li key={s.orderId} className="rounded-xl border border-outline p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-sm font-medium text-ink">
                      {s.sequence}. {s.address.street}
                      {s.address.city ? `, ${s.address.city}` : ''}
                    </span>
                    <Link className="text-xs font-semibold text-primary underline" to={`/orders/${s.orderId}`}>
                      Pedido {formatShortId(s.orderId)}
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDay(s.scheduledDate)} · {formatSlot(s.slot)}
                    {batch.status === 'dissolved' || batch.status === 'completed'
                      ? ''
                      : s.active
                        ? ` · llega ~${formatEta(s.etaAt)}`
                        : ' · salió del lote'}
                  </p>
                  <p className="text-xs text-muted">
                    {s.customerName ?? 'Cliente'} · {formatKg(s.weightKg)} ·{' '}
                    {s.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
                    {s.legDistanceKm > 0 ? ` · ${s.legDistanceKm} km desde la anterior` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="batch-offers">
            <h3 id="batch-offers" className="mb-2 text-sm font-semibold text-ink">
              Choferes contactados
            </h3>
            {batch.offers.length === 0 ? (
              <p className="text-sm text-muted">Todavía no se le ofreció a ningún chofer.</p>
            ) : (
              <ol className="space-y-2">
                {batch.offers.map((o) => (
                  <li key={o.offerId} className="rounded-xl border border-outline p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{o.driverName ?? 'Chofer'}</span>
                      <Badge label={offerLabel(o)} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {o.status === 'pending'
                        ? `Vence el ${formatDateTime(o.expiresAt)}`
                        : isWithdrawn(o)
                          ? `Se retiró el ${formatDateTime(o.respondedAt ?? o.expiresAt)}`
                          : o.status === 'expired'
                            ? `Venció el ${formatDateTime(o.expiresAt)} sin respuesta`
                            : `Respondió el ${formatDateTime(o.respondedAt ?? o.expiresAt)}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </RecordDrawer>
  );
};
