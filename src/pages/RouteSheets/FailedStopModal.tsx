import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormSelect, FormTextArea, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { FailedStopBody, RouteSheetExecutionStop } from '../../services/api/types';
import { isSheetBusy, useFailRouteSheetStop } from '../../services/queries/routeSheets';
import { notify } from '../../utils/notifications';
import { notifySheetError } from './routeSheetErrors';
import { FAILED_REASON, failedOutcomeText, stopName } from './routeSheetLabels';
import { failedStopSchema, type FailedStopValues } from './routeSheetSchemas';

interface Props {
  sheetId: string;
  stop: RouteSheetExecutionStop;
  onClose: () => void;
}

/** «No pude entregar» en nombre del chofer: el motivo (y la nota) quedan en la parada y el pedido vuelve al despacho. */
export const FailedStopModal = ({ sheetId, stop, onClose }: Props) => {
  const formId = useId();
  const fail = useFailRouteSheetStop();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<FailedStopValues>({
    resolver: zodResolver(failedStopSchema),
    defaultValues: { reason: '' as FailedStopValues['reason'], note: '' },
  });
  const name = stopName(stop);

  const submit = (values: FailedStopValues) => {
    setServerError(null);
    const note = values.note.trim();
    const body: FailedStopBody = note ? { reason: values.reason, note } : { reason: values.reason };
    fail.mutate(
      { sheetId, orderId: stop.orderId, body },
      {
        onSuccess: (result) => {
          notify.success(failedOutcomeText(name, result));
          onClose();
        },
        onError: (error) => {
          if (isSheetBusy(error)) {
            notifySheetError(error);
            onClose();
          } else setServerError(errorMessage(error));
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={fail.isPending}
      size="sm"
      title={`No se pudo entregar a ${name}`}
      description={
        stop.failedAttempts > 0
          ? 'Ya es el segundo intento: la parada sale de la hoja y el sistema reprograma el pedido para el próximo día hábil, sin franja fija. Al cliente y al chofer les llega el aviso.'
          : 'El pedido sigue siendo del chofer y pasa al final del recorrido; al cliente se le avisa la franja nueva. Si vuelve a fallar, se reprograma para otro día.'
      }
      footer={
        <>
          <Button variant="secondary" disabled={fail.isPending} onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={fail.isPending}>
            Marcar no entregado
          </Button>
        </>
      }
    >
      <Form methods={methods} id={formId} onSubmit={submit} className="grid gap-4">
        <FormSelect
          name="reason"
          label="Motivo"
          options={[
            { value: '', label: 'Elegí el motivo' },
            ...Object.entries(FAILED_REASON).map(([value, label]) => ({ value, label })),
          ]}
        />
        <FormTextArea name="note" label="Detalle" hint="Obligatorio con «Otro». De 3 a 280 caracteres." />
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
