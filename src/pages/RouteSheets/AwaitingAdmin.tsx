import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Hourglass, XCircle } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, Form, FormInput, Modal, ReasonModal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { RouteSheet, RouteSheetExecutionStop } from '../../services/api/types';
import {
  useCancelAwaitingOrder,
  useRescheduleAwaitingOrder,
  useRouteSheetExecutions,
} from '../../services/queries/routeSheets';
import { argentinaDay } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { REMOVED_REASON, dayLabel, hhmm, isTracked, sheetTitle, stopName } from './routeSheetLabels';
import { buildRescheduleSchema, cancelReasonError, type RescheduleValues } from './routeSheetSchemas';

interface ActionsProps {
  stop: RouteSheetExecutionStop;
  canWrite: boolean;
}

/** Lo que decide el admin con un pedido que salió de la hoja: cambiarle la fecha o cancelarlo. */
export const AwaitingOrderActions = ({ stop, canWrite }: ActionsProps) => {
  const formId = useId();
  const reschedule = useRescheduleAwaitingOrder();
  const cancel = useCancelAwaitingOrder();
  const [mode, setMode] = useState<'date' | 'cancel' | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const today = argentinaDay(new Date());
  const schema = useMemo(() => buildRescheduleSchema(today), [today]);
  const methods = useForm<RescheduleValues>({ resolver: zodResolver(schema), defaultValues: { scheduledDate: '' } });
  const name = stopName(stop);
  if (!canWrite) return null;

  const close = () => {
    setMode(null);
    setServerError(null);
  };

  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          onClick={() => {
            methods.reset({ scheduledDate: '' });
            setMode('date');
          }}
        >
          Cambiar la fecha
        </Button>
        <Button variant="ghost" size="sm" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setMode('cancel')}>
          Cancelar el pedido
        </Button>
      </div>
      {mode === 'date' && (
        <Modal
          open
          onClose={close}
          closeBlocked={reschedule.isPending}
          size="sm"
          title={`Nueva fecha para ${name}`}
          description="El pedido entra en la planificación de ese día. La franja la decide el planificador."
          footer={
            <>
              <Button variant="secondary" disabled={reschedule.isPending} onClick={close}>
                Volver
              </Button>
              <Button type="submit" form={formId} loading={reschedule.isPending}>
                Cambiar la fecha
              </Button>
            </>
          }
        >
          <Form
            methods={methods}
            id={formId}
            onSubmit={(values) => {
              setServerError(null);
              reschedule.mutate(
                { orderId: stop.orderId, scheduledDate: values.scheduledDate },
                {
                  onSuccess: () => {
                    notify.success(`${name}: quedó para el ${dayLabel(values.scheduledDate)}`);
                    close();
                  },
                  onError: (error) => setServerError(errorMessage(error)),
                },
              );
            }}
          >
            <FormInput name="scheduledDate" label="Día de entrega" type="date" min={today} />
          </Form>
          {serverError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {serverError}
            </p>
          )}
        </Modal>
      )}
      <ReasonModal
        open={mode === 'cancel'}
        onClose={close}
        onConfirm={(reason) => {
          setServerError(null);
          cancel.mutate(
            { orderId: stop.orderId, reason },
            {
              onSuccess: () => {
                notify.success(`${name}: pedido cancelado`);
                close();
              },
              onError: (error) => setServerError(errorMessage(error)),
            },
          );
        }}
        title={`¿Cancelar el pedido de ${name}?`}
        description="El pedido queda cancelado y se le avisa al cliente. Si estaba pago, la devolución sigue el circuito de siempre."
        reasonLabel="Motivo de la cancelación"
        confirmLabel="Cancelar el pedido"
        validateReason={cancelReasonError}
        serverError={serverError}
        onReasonChange={() => setServerError(null)}
        loading={cancel.isPending}
      />
    </>
  );
};

interface CardProps {
  sheets: RouteSheet[];
  canWrite: boolean;
  onOpen: (sheetId: string) => void;
}

/**
 * «Esperando al admin»: los pedidos que salieron de una hoja del día en la calle y nadie reprogramó (los sacó el
 * admin, se liberaron por fuera de la hoja o no se pudo reprogramar solo). No vuelven al despacho común: el admin les
 * cambia la fecha o los cancela.
 */
export const AwaitingAdminCard = ({ sheets, canWrite, onOpen }: CardProps) => {
  const tracked = sheets.filter((s) => isTracked(s.status));
  const results = useRouteSheetExecutions(tracked.map((s) => s.id));
  const waiting = results.flatMap((result, i) =>
    (result.data?.stops ?? []).filter((s) => s.awaitingAdmin).map((stop) => ({ stop, sheet: tracked[i] })),
  );
  if (tracked.length === 0) return null;
  const loading = results.some((r) => r.isPending);
  const failed = results.some((r) => r.isError);

  return (
    <Card>
      <div className="px-4 pt-3">
        <CardHeader
          as="h3"
          icon={<Hourglass />}
          title={`Esperando al admin (${waiting.length})`}
          subtitle="Pedidos que salieron de una hoja en la calle y esperan que decidas: cambiarles la fecha o cancelarlos."
          className="mb-2"
        />
      </div>
      <div className="px-4 pb-4">
        {loading ? (
          <p className="text-[13px] text-muted">Buscando pedidos…</p>
        ) : waiting.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Hourglass aria-hidden="true" className="h-4 w-4" />
            {failed ? 'No se pudo leer el seguimiento de alguna hoja.' : 'No hay pedidos esperando una decisión.'}
          </p>
        ) : (
          <ul className="divide-y divide-outline-soft" aria-label="Pedidos esperando al admin">
            {waiting.map(({ stop, sheet }) => (
              <li key={stop.orderId} className="py-2.5 text-[13px] text-ink">
                <b className="font-semibold">{stopName(stop)}</b> · {stop.address ?? 'Sin dirección'}
                <span className="block text-xs text-muted">
                  {stop.removedReason ? REMOVED_REASON[stop.removedReason] : 'Salió de la hoja'}
                  {stop.removedNote && `: ${stop.removedNote}`}
                  {stop.removedAt && ` · ${hhmm(stop.removedAt)}`} ·{' '}
                  <button type="button" className="font-semibold underline" onClick={() => onOpen(sheet.id)}>
                    {sheetTitle(sheet)}
                  </button>
                </span>
                <AwaitingOrderActions stop={stop} canWrite={canWrite} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
