import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { FuelLoad } from '../../../services/api/types';
import { useCars } from '../../../services/queries/cars';
import { useCreateFuelLoad, useFuelLoads, useUpdateFuelLoad } from '../../../services/queries/fleetExpense';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { CashBoxField } from '../../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../../Orders/components/useOrderCashBoxes';
import { fromLocalInput, toLocalInput } from '../fleetExpenseDates';
import {
  expectedFuelAmount,
  FUEL_PAYMENT_OPTIONS,
  FUEL_TYPE_OPTIONS,
  fuelFitsTank,
  fuelLoadSchema,
  type FuelLoadFormValues,
} from '../fleetExpenseSchemas';
import { useCarOptions } from './useCarOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con carga es edición (CU-320); sin ella, alta (CU-195). */
  load: FuelLoad | null;
  /** Se abre desde la ficha de un vehículo: queda fijo. */
  fixedCarId?: string;
}

const EMPTY: FuelLoadFormValues = {
  carId: '',
  loadedAt: '',
  fuelType: '',
  liters: 0,
  unitPrice: 0,
  totalAmount: 0,
  odometerKm: 0,
  isFullTank: true,
  station: '',
  paymentMethod: 'card',
  receiptNumber: '',
  notes: '',
  odometerCorrection: false,
  odometerCorrectionNote: '',
};

/** Alta o edición de una carga de combustible. El importe y el kilometraje se validan igual que en la API. */
export const FuelLoadFormModal = ({ open, onClose, load, fixedCarId }: Props) => {
  const isEditing = Boolean(load);
  // Una carga que ya salió de una caja no cambia de importe ni de medio de pago (la API responde 409).
  const locked = Boolean(load?.cashMovementId);
  const create = useCreateFuelLoad();
  const update = useUpdateFuelLoad();
  const { options: carOptions } = useCarOptions('Elegí un vehículo');
  const { data: cars } = useCars();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FuelLoadFormValues>({ resolver: zodResolver(fuelLoadSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      load
        ? {
            carId: load.carId,
            loadedAt: toLocalInput(load.loadedAt),
            fuelType: load.fuelType,
            liters: load.liters,
            unitPrice: load.unitPrice,
            totalAmount: load.totalAmount,
            odometerKm: load.odometerKm,
            isFullTank: load.isFullTank,
            station: load.station ?? '',
            paymentMethod: load.paymentMethod,
            receiptNumber: load.receiptNumber ?? '',
            notes: load.notes ?? '',
            odometerCorrection: false,
            odometerCorrectionNote: '',
          }
        : { ...EMPTY, carId: fixedCarId ?? '', loadedAt: toLocalInput(new Date()) },
    );
  }, [open, load, fixedCarId, reset]);

  const [cashBoxId, setCashBoxId] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCashBoxId('');
    setTouched(false);
  }, [open, load]);
  const paysFromBox = !isEditing && watch('paymentMethod') === 'cash_box';
  const cashBoxes = useOrderCashBoxes(open && paysFromBox);
  const needsBox = paysFromBox && cashBoxes.required;
  const boxError = touched && needsBox && !cashBoxId ? 'Elegí la caja de la que sale el efectivo' : undefined;

  const carId = watch('carId');
  const liters = Number(watch('liters'));
  const unitPrice = Number(watch('unitPrice'));
  const correcting = watch('odometerCorrection');
  const car = cars?.find((c) => c.car_id === carId);
  const expected = liters > 0 && unitPrice > 0 ? expectedFuelAmount(liters, unitPrice) : null;
  const tankWarning =
    liters > 0 && car && !fuelFitsTank(liters, car.tank_capacity_liters)
      ? `Supera la capacidad del tanque (${car.tank_capacity_liters} L, con 5 % de tolerancia).`
      : undefined;

  // Sugiere el kilometraje de la última carga vigente del vehículo (CU-195, paso 2).
  const { data: last } = useFuelLoads({ page: 0, pageSize: 1 }, { carId }, { enabled: open && !isEditing && !!carId });
  const lastOdometer = last?.data[0]?.odometerKm;
  useEffect(() => {
    if (isEditing || lastOdometer === undefined) return;
    if (!Number(getValues('odometerKm'))) setValue('odometerKm', lastOdometer);
  }, [isEditing, lastOdometer, getValues, setValue]);

  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit((values) => {
    setTouched(true);
    if (paysFromBox && (cashBoxes.loading || cashBoxes.failed)) {
      notify.error(new Error('No pudimos cargar las cajas: probá de nuevo'));
      return;
    }
    if (needsBox && !cashBoxId) return;
    const body = {
      loadedAt: fromLocalInput(values.loadedAt),
      fuelType: values.fuelType || undefined,
      liters: values.liters,
      unitPrice: values.unitPrice,
      totalAmount: values.totalAmount,
      odometerKm: values.odometerKm,
      isFullTank: values.isFullTank,
      station: values.station || null,
      paymentMethod: values.paymentMethod,
      receiptNumber: values.receiptNumber || null,
      notes: values.notes || null,
      ...(values.odometerCorrection
        ? { odometerCorrection: true, odometerCorrectionNote: values.odometerCorrectionNote }
        : {}),
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Carga actualizada' : 'Carga registrada');
        onClose();
      },
      onError: notify.error,
    };
    if (load) update.mutate({ id: load.fuelLoadId, body }, options);
    else
      create.mutate(
        { ...body, carId: values.carId, cashBoxId: paysFromBox && cashBoxId ? cashBoxId : undefined },
        options,
      );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      size="md"
      title={isEditing ? 'Editar carga de combustible' : 'Nueva carga de combustible'}
      description={
        isEditing
          ? `${load?.carPatent ?? 'Vehículo'} · se revalidan el importe y el kilometraje`
          : 'El kilometraje del vehículo se actualiza con la carga.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="fuel-load-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Registrar carga'}
          </Button>
        </>
      }
    >
      <form id="fuel-load-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Select
            label="Vehículo"
            required
            options={carOptions}
            disabled={isEditing || Boolean(fixedCarId)}
            error={errors.carId?.message}
            {...register('carId')}
          />
        </div>
        <Input label="Fecha y hora" type="datetime-local" error={errors.loadedAt?.message} {...register('loadedAt')} />
        <Select
          label="Combustible"
          options={[{ value: '', label: 'El del vehículo' }, ...FUEL_TYPE_OPTIONS]}
          error={errors.fuelType?.message}
          {...register('fuelType')}
        />
        <Input
          label="Litros"
          type="number"
          step="0.01"
          min={0}
          required
          error={errors.liters?.message ?? tankWarning}
          {...register('liters')}
        />
        <Input
          label="Precio por litro"
          type="number"
          step="0.001"
          min={0}
          required
          error={errors.unitPrice?.message}
          {...register('unitPrice')}
        />
        <div>
          <Input
            label="Importe total"
            type="number"
            step="0.01"
            min={0}
            required
            hint={expected === null ? undefined : `Litros × precio: ${formatCurrency(expected)}`}
            disabled={locked}
            error={errors.totalAmount?.message}
            {...register('totalAmount')}
          />
          {expected !== null && !locked && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => setValue('totalAmount', expected, { shouldValidate: true })}
            >
              Usar el importe calculado
            </Button>
          )}
        </div>
        <Input
          label="Kilometraje"
          type="number"
          step={1}
          min={0}
          required
          hint={
            !isEditing && lastOdometer !== undefined
              ? `Última carga: ${formatNumber(lastOdometer)} km`
              : car?.odometer_km != null
                ? `Vehículo: ${formatNumber(car.odometer_km)} km`
                : undefined
          }
          error={errors.odometerKm?.message}
          {...register('odometerKm')}
        />
        <Select
          label="Medio de pago"
          required
          options={FUEL_PAYMENT_OPTIONS}
          disabled={locked}
          error={errors.paymentMethod?.message}
          {...register('paymentMethod')}
        />
        {paysFromBox && (
          <div className="sm:col-span-2">
            <CashBoxField
              boxes={cashBoxes.boxes}
              value={cashBoxId}
              onChange={setCashBoxId}
              error={boxError}
              hint="El importe sale de esta caja en efectivo. Si exige sesión, tiene que estar abierta."
            />
          </div>
        )}
        {locked && (
          <p className="text-xs text-muted sm:col-span-2">
            Esta carga ya salió de una caja: no se cambian su importe ni su medio de pago. Para corregirlos, anulala y
            registrala de nuevo.
          </p>
        )}
        <Input label="Estación" maxLength={120} error={errors.station?.message} {...register('station')} />
        <Input
          label="Comprobante"
          maxLength={40}
          placeholder="Nº de ticket o factura"
          error={errors.receiptNumber?.message}
          {...register('receiptNumber')}
        />
        <div className="sm:col-span-2">
          <Checkbox
            label="Llenó el tanque"
            hint="El consumo se mide entre cargas de tanque lleno."
            {...register('isFullTank')}
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Notas" maxLength={2000} error={errors.notes?.message} {...register('notes')} />
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Checkbox
            label="Corregir el kilometraje"
            hint="Sólo si el kilometraje es menor que el de la carga anterior (p. ej. se cambió el tablero). Queda con una nota."
            {...register('odometerCorrection')}
          />
          {correcting && (
            <Input
              label="Nota de la corrección"
              required
              maxLength={500}
              error={errors.odometerCorrectionNote?.message}
              {...register('odometerCorrectionNote')}
            />
          )}
        </div>
      </form>
    </Modal>
  );
};
