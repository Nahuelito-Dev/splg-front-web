import { Button, Modal } from '../../common/components/ui';
import type { RoutePlanDay, RoutePlanProposal } from '../../services/api/types';
import { PROPOSAL_REASON, customerIndex, formatKm, formatMinutes } from './routeSheetLabels';

interface Props {
  proposal: RoutePlanProposal;
  day: RoutePlanDay | undefined;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
}

/**
 * La vista previa de la propuesta (`dryRun`): qué hojas armaría el sistema y qué pedidos quedarían afuera, sin crear
 * nada. «Crear estas hojas» la pide de verdad (puede variar si en el medio entró o se movió algo).
 */
export const ProposalDialog = ({ proposal, day, applying, onApply, onClose }: Props) => {
  const drivers = new Map((day?.resources.drivers ?? []).map((d) => [d.deliveryId, d.name ?? 'Chofer']));
  const cars = new Map((day?.resources.cars ?? []).map((c) => [c.carId, c.patent ?? 'Sin patente']));
  const customers = customerIndex(day);
  const kept = proposal.keptSheetIds.length;
  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={applying}
      size="md"
      title="Propuesta del sistema"
      description={`Vista previa con ${proposal.candidates} pedido(s) programado(s), agrupados por zona, franja y capacidad del vehículo. Todavía no se creó nada.`}
      footer={
        <>
          <Button variant="secondary" disabled={applying} onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={applying} disabled={proposal.sheets.length === 0} onClick={onApply}>
            Crear estas hojas
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[13px]">
        {proposal.sheets.length === 0 ? (
          <p className="text-muted">Con los choferes, vehículos y pedidos de ese día no se arma ninguna hoja nueva.</p>
        ) : (
          <ul
            aria-label="Hojas propuestas"
            className="divide-y divide-outline-soft rounded-xl border border-outline-soft"
          >
            {proposal.sheets.map((sheet, i) => (
              <li key={`${sheet.deliveryId}-${sheet.carId}`} className="grid gap-0.5 px-3 py-2.5">
                <b className="font-semibold text-ink">
                  Hoja {i + 1}: {cars.get(sheet.carId) ?? 'Vehículo'} · {drivers.get(sheet.deliveryId) ?? 'Chofer'}
                </b>
                <span className="text-xs text-muted">
                  {sheet.orderIds.length} parada(s) · {sheet.units} garrafa(s) · {formatKm(sheet.distanceKm)} ·{' '}
                  {formatMinutes(sheet.durationMin)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {kept > 0 && (
          <p className="text-muted">
            {kept} hoja(s) que ya se editaron o confirmaron se conservan como están: la propuesta no las toca.
          </p>
        )}
        {proposal.unassigned.length > 0 && (
          <section aria-label="Quedarían sin hoja">
            <h3 className="mb-1.5 text-sm font-semibold text-ink">Quedarían sin hoja ({proposal.unassigned.length})</h3>
            <ul className="space-y-1">
              {proposal.unassigned.map((order) => (
                <li key={order.orderId}>
                  <span className="text-ink">{customers.get(order.orderId) ?? 'Pedido'}</span>
                  <span className="block text-xs text-warn">{PROPOSAL_REASON[order.reason]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {proposal.matrixSource === 'haversine' && (
          <p className="text-xs text-muted">
            Las distancias se calcularon en línea recta (el servicio de calles no respondió).
          </p>
        )}
      </div>
    </Modal>
  );
};
