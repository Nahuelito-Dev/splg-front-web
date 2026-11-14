import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { RoutePlanDay, RouteSheet, RouteSheetExecution } from '../../services/api/types';
import { isSheetBusy, isVersionConflict, useAddRouteSheetStop } from '../../services/queries/routeSheets';
import { notify } from '../../utils/notifications';
import { notifySheetError } from './routeSheetErrors';
import { sheetTitle, slotOf } from './routeSheetLabels';
import { buildLiveStopSchema, type LiveStopValues } from './routeSheetSchemas';

interface Props {
  day: RoutePlanDay;
  sheet: RouteSheet;
  execution: RouteSheetExecution;
  onClose: () => void;
}

/**
 * Agregar un pedido del día a la hoja en curso: se le asigna al chofer y entra donde menos atrasa lo que falta
 * (o en la posición elegida: 1 es la próxima después de la que está en camino). Al chofer sólo se le avisa.
 */
export const LiveStopModal = ({ day, sheet, execution, onClose }: Props) => {
  const formId = useId();
  const add = useAddRouteSheetStop();
  const [serverError, setServerError] = useState<string | null>(null);
  const candidates = day.unassigned.filter((o) => !o.blockedReason);
  const pending = execution.stops.filter((s) => s.progress === 'pending').length;
  const schema = useMemo(() => buildLiveStopSchema(pending + 1), [pending]);
  const methods = useForm<LiveStopValues>({
    resolver: zodResolver(schema),
    defaultValues: { orderId: candidates.length === 1 ? candidates[0].orderId : '', position: '' },
  });

  const submit = (values: LiveStopValues) => {
    setServerError(null);
    const order = candidates.find((o) => o.orderId === values.orderId);
    add.mutate(
      {
        // La edición en curso viaja con la versión que se ve en el seguimiento.
        sheet: { ...sheet, version: execution.version },
        orderId: values.orderId,
        position: values.position === '' ? undefined : Number(values.position),
      },
      {
        onSuccess: () => {
          notify.success(
            `${order?.customerName ?? 'El pedido'} quedó en ${sheetTitle(sheet)}: el chofer recibe el aviso`,
          );
          onClose();
        },
        onError: (error) => {
          if (isVersionConflict(error) || isSheetBusy(error)) {
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
      closeBlocked={add.isPending}
      size="sm"
      title="Agregar un pedido a la hoja en curso"
      description="El pedido se le asigna al chofer y entra donde menos atrasa el recorrido, salvo que elijas la posición."
      footer={
        <>
          <Button variant="secondary" disabled={add.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={add.isPending} disabled={candidates.length === 0}>
            Agregar
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-muted">No hay pedidos del día sin hoja que se puedan agregar.</p>
      ) : (
        <Form methods={methods} id={formId} onSubmit={submit} className="grid gap-4">
          <FormSelect
            name="orderId"
            label="Pedido"
            options={[
              { value: '', label: 'Elegí un pedido' },
              ...candidates.map((o) => ({
                value: o.orderId,
                label: `${o.customerName ?? 'Cliente'} · ${o.address ?? 'Sin dirección'} · ${slotOf(o)}`,
              })),
            ]}
          />
          <FormInput
            name="position"
            label="Posición (opcional)"
            type="number"
            inputMode="numeric"
            min={1}
            hint="Vacío: donde convenga. 1 es la próxima después de la que está en camino."
          />
        </Form>
      )}
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
