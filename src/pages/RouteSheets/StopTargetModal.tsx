import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormCheckbox, FormInput, FormSelect, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { RoutePlanDay, RouteSheet, RouteSheetStop } from '../../services/api/types';
import {
  isSheetBusy,
  isVersionConflict,
  useAddRouteSheetStop,
  useMoveRouteSheetStop,
} from '../../services/queries/routeSheets';
import { notify } from '../../utils/notifications';
import { notifySheetError } from './routeSheetErrors';
import { buildStopTargetSchema, type StopTargetValues } from './routeSheetSchemas';
import { driverOf, sheetTitle, stopName, vehicleOf } from './routeSheetLabels';

/** Agregar un pedido sin hoja (con la hoja y la posición sugeridas, si las hay) o mover una parada a otra hoja. */
export type StopTarget =
  | { kind: 'add'; orderId: string; customerName: string; sheetId?: string; position?: number }
  | { kind: 'move'; sheet: RouteSheet; stop: RouteSheetStop };

type Values = StopTargetValues;

interface Props {
  day: RoutePlanDay;
  target: StopTarget;
  onClose: () => void;
}

export const StopTargetModal = ({ day, target, onClose }: Props) => {
  const formId = useId();
  const add = useAddRouteSheetStop();
  const moveStop = useMoveRouteSheetStop();
  const pending = add.isPending || moveStop.isPending;
  const [serverError, setServerError] = useState<string | null>(null);
  const sourceId = target.kind === 'move' ? target.sheet.id : null;
  const drafts = useMemo(
    () => day.sheets.filter((s) => s.status === 'draft' && s.id !== sourceId),
    [day.sheets, sourceId],
  );
  const schema = useMemo(() => buildStopTargetSchema(drafts), [drafts]);
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetSheetId: (target.kind === 'add' && target.sheetId) || (drafts.length === 1 ? drafts[0].id : ''),
      position: target.kind === 'add' && target.position ? String(target.position) : '',
      acceptLateStops: false,
    },
  });
  const name = target.kind === 'add' ? target.customerName : stopName(target.stop);

  const onError = (error: unknown) => {
    if (isVersionConflict(error) || isSheetBusy(error)) {
      notifySheetError(error);
      onClose();
    } else setServerError(errorMessage(error));
  };

  const submit = (values: Values) => {
    setServerError(null);
    const sheet = drafts.find((s) => s.id === values.targetSheetId);
    if (!sheet) return;
    const position = values.position === '' ? undefined : Number(values.position);
    const acceptLateStops = values.acceptLateStops || undefined;
    if (target.kind === 'add') {
      add.mutate(
        { sheet, orderId: target.orderId, position, acceptLateStops },
        {
          onSuccess: () => {
            notify.success(`${name} quedó en ${sheetTitle(sheet)}`);
            onClose();
          },
          onError,
        },
      );
    } else {
      moveStop.mutate(
        { sheet: target.sheet, orderId: target.stop.orderId, target: sheet, position, acceptLateStops },
        {
          onSuccess: () => {
            notify.success(`${name} pasó a ${sheetTitle(sheet)}`);
            onClose();
          },
          onError,
        },
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={pending}
      size="sm"
      title={target.kind === 'add' ? 'Agregar a una hoja' : 'Mover a otra hoja'}
      description={`${name}: el sistema lo ubica donde menos alarga el recorrido, salvo que elijas la posición.`}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending} disabled={drafts.length === 0}>
            {target.kind === 'add' ? 'Agregar' : 'Mover'}
          </Button>
        </>
      }
    >
      {drafts.length === 0 ? (
        <p className="text-sm text-muted">No hay otra hoja en borrador ese día. Creá una o reabrí una confirmada.</p>
      ) : (
        <Form methods={methods} id={formId} onSubmit={submit} className="grid gap-4">
          <FormSelect
            name="targetSheetId"
            label="Hoja"
            options={[
              { value: '', label: 'Elegí una hoja' },
              ...drafts.map((s) => ({
                value: s.id,
                label: `${sheetTitle(s)} · ${vehicleOf(s)} · ${driverOf(s)} (${s.stops.length} paradas)`,
              })),
            ]}
          />
          <FormInput
            name="position"
            label="Posición (opcional)"
            type="number"
            inputMode="numeric"
            min={1}
            hint="Vacío: donde convenga. 1 es la primera parada."
          />
          <FormCheckbox
            name="acceptLateStops"
            label="Agregarlo aunque llegue fuera de su franja"
            hint="Sin esto, el sistema lo rechaza si no se llega a tiempo."
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
