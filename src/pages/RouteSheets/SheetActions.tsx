import { CircleCheck, FileDown, Play, RotateCcw, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../common/components/ui';
import { usePdfDownload } from '../../hooks';
import { RouteSheetNotConfirmableError, RouteSheetShortagesError } from '../../services/api/routeSheets';
import type {
  RouteOrderSummary,
  RouteSheet,
  RouteSheetViolation,
  StartRouteSheetShortage,
} from '../../services/api/types';
import {
  useCancelRouteSheet,
  useConfirmRouteSheet,
  useOptimizeRouteSheet,
  useReopenRouteSheet,
  useStartRouteSheet,
} from '../../services/queries/routeSheets';
import { confirm, notify } from '../../utils/notifications';
import { ConfirmViolationsDialog } from './ConfirmViolationsDialog';
import { notifySheetError } from './routeSheetErrors';
import { driverOf, isPlanToday, sheetTitle } from './routeSheetLabels';
import { ShortagesDialog } from './ShortagesDialog';

interface Props {
  sheet: RouteSheet;
  canWrite: boolean;
  onOptimized: (result: { before: RouteOrderSummary; after: RouteOrderSummary }) => void;
}

/** Lo que se le hace a la hoja entera: optimizar, confirmar o reabrir, iniciarla en nombre del chofer, cancelar y bajar el PDF. */
export const SheetActions = ({ sheet, canWrite, onOptimized }: Props) => {
  const optimize = useOptimizeRouteSheet();
  const confirmSheet = useConfirmRouteSheet();
  const reopen = useReopenRouteSheet();
  const cancel = useCancelRouteSheet();
  const start = useStartRouteSheet();
  const pdf = usePdfDownload();
  const [violations, setViolations] = useState<RouteSheetViolation[] | null>(null);
  const [shortages, setShortages] = useState<StartRouteSheetShortage[] | null>(null);
  const draft = sheet.status === 'draft';
  const live = draft || sheet.status === 'confirmed';
  const pending =
    optimize.isPending || confirmSheet.isPending || reopen.isPending || cancel.isPending || start.isPending;
  const startBlocked = !sheet.deliveryId
    ? 'La hoja no tiene chofer'
    : !isPlanToday(sheet.planDate)
      ? 'Sólo se inicia el día del reparto'
      : undefined;

  const handleOptimize = () =>
    optimize.mutate(sheet, {
      onSuccess: ({ before, after }) => {
        onOptimized({ before, after });
        notify.success(
          after.distanceKm < before.distanceKm - 0.05 || after.durationMin < before.durationMin - 0.5
            ? 'Paradas reordenadas: mirá el antes y el después'
            : 'El orden ya era el mejor para esta hoja',
        );
      },
      onError: notifySheetError,
    });

  const handleConfirm = (acceptLateStops?: boolean) =>
    confirmSheet.mutate(
      { sheet, acceptLateStops },
      {
        onSuccess: (confirmed) => {
          setViolations(null);
          notify.success(`${sheetTitle(confirmed)} confirmada: quedó lista para el chofer`);
        },
        onError: (error) => {
          if (error instanceof RouteSheetNotConfirmableError) setViolations(error.violations);
          else {
            setViolations(null);
            notifySheetError(error);
          }
        },
      },
    );

  const startSheet = (acknowledgeShortages?: boolean) =>
    start.mutate(
      { sheetId: sheet.id, acknowledgeShortages },
      {
        onSuccess: (result) => {
          setShortages(null);
          if (result.alreadyStarted) {
            notify.info('La hoja ya estaba iniciada');
            return;
          }
          notify.success(
            `${sheetTitle(sheet)} en viaje: se les avisó a ${result.notifiedCustomers} cliente(s) que su pedido está en camino`,
          );
          if (result.droppedOrderIds.length > 0) {
            notify.warn(`${result.droppedOrderIds.length} pedido(s) ya no estaban disponibles y salieron de la hoja`);
          }
        },
        onError: (error) => {
          if (error instanceof RouteSheetShortagesError) setShortages(error.shortages);
          else {
            setShortages(null);
            notifySheetError(error);
          }
        },
      },
    );

  const handleStart = async () => {
    const ok = await confirm({
      title: `¿Iniciar el viaje de ${sheetTitle(sheet)} en nombre de ${driverOf(sheet)}?`,
      text: 'Hace falta que el chofer tenga en uso el vehículo de la hoja y que la carga del camión ya haya salido del depósito. A todos los clientes de la hoja se les avisa que su pedido está en camino, con la franja estimada.',
      confirmText: 'Iniciar viaje',
    });
    if (ok) startSheet();
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: `¿Cancelar ${sheetTitle(sheet)}?`,
      text: 'La hoja queda descartada y sus pedidos vuelven a «Sin asignar». No se puede deshacer.',
      confirmText: 'Cancelar la hoja',
      danger: true,
    });
    if (!ok) return;
    cancel.mutate(sheet, {
      onSuccess: () => notify.success('Hoja cancelada: sus pedidos volvieron a «Sin asignar»'),
      onError: notifySheetError,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {draft && canWrite && (
        <Button
          variant="secondary"
          size="sm"
          icon={<Wand2 className="h-3.5 w-3.5" />}
          loading={optimize.isPending}
          disabled={pending || sheet.stops.length < 2}
          onClick={handleOptimize}
        >
          Ordenar óptimo
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        icon={<FileDown className="h-3.5 w-3.5" />}
        loading={pdf.pending}
        onClick={() =>
          pdf.download({ kind: 'route-sheet', sheetId: sheet.id, planDate: sheet.planDate, number: sheet.number })
        }
      >
        Descargar PDF
      </Button>
      {live && canWrite && (
        <Button
          variant="secondary"
          size="sm"
          icon={<X className="h-3.5 w-3.5" />}
          loading={cancel.isPending}
          disabled={pending}
          onClick={() => void handleCancel()}
        >
          Cancelar hoja
        </Button>
      )}
      {sheet.status === 'confirmed' && canWrite && (
        <Button
          size="sm"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          loading={reopen.isPending}
          disabled={pending}
          onClick={() =>
            reopen.mutate(sheet, {
              onSuccess: () => notify.info('La hoja volvió a borrador: ya se puede editar'),
              onError: notifySheetError,
            })
          }
        >
          Reabrir
        </Button>
      )}
      {sheet.status === 'confirmed' && canWrite && (
        <Button
          size="sm"
          icon={<Play className="h-3.5 w-3.5" />}
          loading={start.isPending}
          disabled={pending}
          blockedReason={startBlocked}
          onClick={() => void handleStart()}
        >
          Iniciar viaje en nombre del chofer
        </Button>
      )}
      {draft && canWrite && (
        <Button
          size="sm"
          icon={<CircleCheck className="h-3.5 w-3.5" />}
          loading={confirmSheet.isPending}
          disabled={pending}
          onClick={() => handleConfirm()}
        >
          Confirmar hoja
        </Button>
      )}
      {shortages && (
        <ShortagesDialog
          sheet={sheet}
          shortages={shortages}
          starting={start.isPending}
          onStartAnyway={() => startSheet(true)}
          onClose={() => setShortages(null)}
        />
      )}
      {violations && (
        <ConfirmViolationsDialog
          sheet={sheet}
          violations={violations}
          confirming={confirmSheet.isPending}
          onAcceptLate={() => handleConfirm(true)}
          onClose={() => setViolations(null)}
        />
      )}
    </div>
  );
};
