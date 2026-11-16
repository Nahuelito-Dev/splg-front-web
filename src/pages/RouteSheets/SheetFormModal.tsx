import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { RoutePlanDay, RouteSheet, UpdateRouteSheetBody } from '../../services/api/types';
import {
  isSheetBusy,
  isVersionConflict,
  useCreateRouteSheet,
  useUpdateRouteSheet,
} from '../../services/queries/routeSheets';
import { useWarehouses } from '../../services/queries/stock';
import { notify } from '../../utils/notifications';
import { notifySheetError } from './routeSheetErrors';
import { sheetFormSchema, type SheetFormValues } from './routeSheetSchemas';
import { hhmm, sheetTitle, startAtOf } from './routeSheetLabels';

type Values = SheetFormValues;

interface Props {
  day: RoutePlanDay;
  /** Sin hoja: alta de un borrador vacío. Con hoja: cambia chofer, vehículo, depósito o salida. */
  sheet?: RouteSheet;
  onClose: () => void;
  onCreated?: (sheet: RouteSheet) => void;
}

export const SheetFormModal = ({ day, sheet, onClose, onCreated }: Props) => {
  const formId = useId();
  const create = useCreateRouteSheet();
  const update = useUpdateRouteSheet();
  const pending = create.isPending || update.isPending;
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<Values>({
    resolver: zodResolver(sheetFormSchema),
    defaultValues: {
      deliveryId: sheet?.deliveryId ?? '',
      carId: sheet?.carId ?? '',
      originWarehouseId: sheet?.originWarehouseId ?? '',
      startTime: sheet?.plannedStartAt ? hhmm(sheet.plannedStartAt) : '',
    },
  });
  const { drivers, cars } = day.resources;
  const warehouses = useWarehouses(false, { enabled: Boolean(sheet) });
  const warehouseOptions = (warehouses.data ?? []).map((w) => ({
    value: w.warehouseId,
    label: `${w.name}${w.isDefault ? ' (predeterminado)' : ''}${w.address ? ` · ${w.address}` : ''}`,
  }));

  const driverOptions = drivers.map((d) => ({
    value: d.deliveryId,
    label: `${d.name ?? 'Chofer'}${d.busySheetId && d.busySheetId !== sheet?.id ? ' · ya tiene hoja' : !d.available ? ' · no disponible' : ''}`,
  }));
  const carOptions = cars.map((c) => ({
    value: c.carId,
    label: `${c.patent ?? 'Sin patente'}${c.description ? ` · ${c.description}` : ''}${c.busySheetId && c.busySheetId !== sheet?.id ? ' · ya tiene hoja' : !c.available ? ' · no disponible' : ''}`,
  }));

  const onError = (error: unknown) => {
    if (isVersionConflict(error) || isSheetBusy(error)) {
      notifySheetError(error);
      onClose();
    } else setServerError(errorMessage(error));
  };

  const submit = (values: Values) => {
    setServerError(null);
    if (!sheet) {
      create.mutate(
        { planDate: day.plan.date, deliveryId: values.deliveryId || undefined, carId: values.carId || undefined },
        {
          onSuccess: (created) => {
            notify.success('Hoja creada en borrador: agregale pedidos desde «Sin asignar»');
            onCreated?.(created);
          },
          onError,
        },
      );
      return;
    }
    const { dirtyFields } = methods.formState;
    const changes: Omit<UpdateRouteSheetBody, 'version'> = {};
    if (dirtyFields.deliveryId && values.deliveryId) changes.deliveryId = values.deliveryId;
    if (dirtyFields.carId && values.carId) changes.carId = values.carId;
    if (dirtyFields.originWarehouseId && values.originWarehouseId) changes.originWarehouseId = values.originWarehouseId;
    if (dirtyFields.startTime && values.startTime) changes.plannedStartAt = startAtOf(sheet.planDate, values.startTime);
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { sheet, changes },
      {
        onSuccess: (saved) => {
          notify.success(`${sheetTitle(saved)}: cambios guardados, las horas se recalcularon`);
          onClose();
        },
        onError,
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={pending}
      size="sm"
      title={sheet ? 'Chofer, vehículo, depósito y salida' : 'Nueva hoja'}
      description={
        sheet
          ? 'Al cambiar la salida, el depósito o el vehículo, el sistema recalcula el recorrido, las horas y la carga.'
          : 'Se crea en borrador. El chofer y el vehículo se pueden elegir después, pero hacen falta para confirmarla.'
      }
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {sheet ? 'Guardar' : 'Crear hoja'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id={formId} onSubmit={submit} className="grid gap-4">
        <FormSelect
          name="deliveryId"
          label="Chofer"
          options={[{ value: '', label: 'Sin chofer todavía' }, ...driverOptions]}
          onChange={(event) => {
            const usual = drivers.find((d) => d.deliveryId === event.target.value)?.usualCarId;
            if (usual && !methods.getValues('carId')) methods.setValue('carId', usual, { shouldDirty: true });
          }}
        />
        <FormSelect
          name="carId"
          label="Vehículo"
          options={[{ value: '', label: 'Sin vehículo todavía' }, ...carOptions]}
        />
        {sheet && (
          <>
            <FormSelect
              name="originWarehouseId"
              label="Depósito de salida"
              hint={
                warehouses.error
                  ? 'No se pudieron cargar los depósitos'
                  : 'De dónde sale y adónde vuelve el vehículo. Sin elegir, usa el predeterminado.'
              }
              disabled={warehouses.isPending && !warehouses.error}
              options={[{ value: '', label: 'El predeterminado de la distribuidora' }, ...warehouseOptions]}
            />
            <FormInput
              name="startTime"
              label="Hora de salida"
              type="time"
              hint="Hora de Argentina. Si la dejás vacía, la hoja conserva la que tiene."
            />
          </>
        )}
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
