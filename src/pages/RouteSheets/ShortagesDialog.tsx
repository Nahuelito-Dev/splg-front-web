import { TriangleAlert } from 'lucide-react';
import { Button, Modal } from '../../common/components/ui';
import type { RouteSheet, StartRouteSheetShortage } from '../../services/api/types';
import { sheetTitle } from './routeSheetLabels';

interface Props {
  sheet: RouteSheet;
  shortages: StartRouteSheetShortage[];
  starting: boolean;
  onStartAnyway: () => void;
  onClose: () => void;
}

/**
 * 409 `ROUTE_SHEET_SHORTAGES` al iniciar: al camión le faltan garrafas llenas para la hoja. Advierte, no bloquea
 * (D-04): se puede iniciar igual y las paradas que no se cubran se resuelven en la calle.
 */
export const ShortagesDialog = ({ sheet, shortages, starting, onStartAnyway, onClose }: Props) => (
  <Modal
    open
    onClose={onClose}
    closeBlocked={starting}
    size="sm"
    title={`Al camión le faltan garrafas para ${sheetTitle(sheet)}`}
    description="La carga del camión no alcanza para todas las paradas. Podés completar la carga y volver a intentar, o iniciar el viaje igual."
    footer={
      <>
        <Button variant="secondary" disabled={starting} onClick={onClose}>
          Volver
        </Button>
        <Button loading={starting} onClick={onStartAnyway}>
          Iniciar igual
        </Button>
      </>
    }
  >
    <ul className="space-y-2" aria-label="Garrafas que faltan">
      {shortages.map((s) => (
        <li key={s.gasCylinderId} className="flex items-start gap-2 text-sm text-ink">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <span>
            <b className="font-semibold">{s.type ?? 'Garrafa'}</b>: faltan {s.missing}
            <span className="block text-xs text-muted">
              La hoja pide {s.required} llena(s) y el camión lleva {s.onTruck}.
            </span>
          </span>
        </li>
      ))}
    </ul>
  </Modal>
);
