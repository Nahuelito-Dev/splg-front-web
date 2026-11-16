import { Badge, DetailList, Drawer, ErrorState, LoadingState, CardHeader } from '../../../common/components/ui';
import { useTire } from '../../../services/queries/fleetExpense';
import { TirePayment } from './TirePayment';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format';
import { TIRE_EVENT_TYPE, TIRE_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  tireId: string | null;
  onClose: () => void;
}

/** Un neumático con su historial de movimientos: de ahí salen los kilómetros que recorrió y en qué vehículos. */
export const TireDrawer = ({ tireId, onClose }: Props) => {
  const { data: tire, isPending, error, refetch } = useTire(tireId ?? undefined);
  return (
    <Drawer open={tireId !== null} onClose={onClose} title="Neumático" description={tire?.serialNumber ?? ''} size="lg">
      {isPending ? (
        <LoadingState />
      ) : error || !tire ? (
        <ErrorState error={error} resource="El neumático" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Badge label={labelOf(TIRE_STATUS, tire.status)} />
          <DetailList
            items={[
              { label: 'Marca', value: tire.brand },
              { label: 'Medida', value: tire.size, mono: true },
              { label: 'Costo', value: formatCurrency(tire.cost) },
              { label: 'Recapados', value: tire.retreadCount },
              { label: 'Vehículo', value: tire.carPatent ?? '—', mono: true },
              { label: 'Posición', value: tire.position, mono: true },
              { label: 'Km recorridos', value: `${formatNumber(tire.kmTraveled)} km` },
              { label: 'Km al montar', value: formatNumber(tire.mountedOdometerKm) },
            ]}
          />
          <TirePayment tire={tire} />
          <section aria-label="Historial de movimientos">
            <CardHeader title="Historial" as="h3" className="mb-2" />
            {(tire.events ?? []).length === 0 ? (
              <p className="text-sm text-muted">Todavía no tuvo movimientos.</p>
            ) : (
              <ul className="divide-y divide-outline rounded-lg border border-outline">
                {(tire.events ?? []).map((event) => (
                  <li
                    key={event.eventId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <Badge label={labelOf(TIRE_EVENT_TYPE, event.type)} />
                    <span className="tabular-nums text-ink-2">
                      {event.position ?? '—'} · {formatNumber(event.odometerKm)} km
                    </span>
                    <span className="text-muted">{formatDateTime(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
};
