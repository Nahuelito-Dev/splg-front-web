import { TriangleAlert } from 'lucide-react';
import { Button, Modal } from '../../common/components/ui';
import type { RouteSheet, RouteSheetViolation } from '../../services/api/types';
import { onlyLateStops, sheetTitle, stopName } from './routeSheetLabels';

interface Props {
  sheet: RouteSheet;
  violations: RouteSheetViolation[];
  confirming: boolean;
  onAcceptLate: () => void;
  onClose: () => void;
}

/**
 * Por qué no se confirmó la hoja (409 del back, regla por regla). Si lo único que falla son paradas fuera de franja,
 * se puede confirmar igual aceptándolas; el resto (chofer, vehículo, capacidad, pedidos que ya no van) hay que
 * resolverlo antes.
 */
export const ConfirmViolationsDialog = ({ sheet, violations, confirming, onAcceptLate, onClose }: Props) => {
  const lateOnly = onlyLateStops(violations);
  const names = new Map(sheet.stops.map((s) => [s.orderId, stopName(s)]));
  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={confirming}
      size="sm"
      title={`${sheetTitle(sheet)} no se pudo confirmar`}
      description={
        lateOnly
          ? 'Lo único que falta es llegar a tiempo a algunas paradas. Podés confirmarla igual: el cliente ve la hora estimada real.'
          : 'Resolvé esto y volvé a confirmar.'
      }
      footer={
        <>
          <Button variant="secondary" disabled={confirming} onClick={onClose}>
            {lateOnly ? 'Cancelar' : 'Entendido'}
          </Button>
          {lateOnly && (
            <Button loading={confirming} onClick={onAcceptLate}>
              Confirmar con paradas fuera de franja
            </Button>
          )}
        </>
      }
    >
      <ul className="space-y-2" aria-label="Qué falta para confirmar">
        {violations.map((v) => (
          <li key={v.code} className="flex items-start gap-2 text-sm text-ink">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <span>
              {v.message}
              {v.orderIds && v.orderIds.length > 0 && (
                <span className="block text-xs text-muted">
                  {v.orderIds.map((id) => names.get(id) ?? 'Pedido').join(', ')}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
