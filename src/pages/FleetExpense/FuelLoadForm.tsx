import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormLoadWarning,
  type LoadWarning,
  FormActions,
  FormCheckbox,
  FormInput,
  FormSection,
  FormSelect,
  FormTextArea,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { usePermissions, useReturnPath, useUnsavedChangesGuard } from '../../hooks';
import type { FuelLoad } from '../../services/api/types';
import { useCars } from '../../services/queries/cars';
import {
  useCreateFuelLoad,
  useFuelLoad,
  useFuelLoadQuote,
  useFuelLoads,
  useUpdateFuelLoad,
} from '../../services/queries/fleetExpense';
import { formatCurrencyExact, formatNumber } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { CashBoxField } from '../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../Orders/components/useOrderCashBoxes';
import { useCarOptions } from './components/useCarOptions';
import { fromLocalInput, toLocalInput } from './fleetExpenseDates';
import {
  FUEL_PAYMENT_OPTIONS,
  FUEL_TYPE_OPTIONS,
  fuelFitsTank,
  fuelLoadSchema,
  type FuelLoadFormValues,
} from './fleetExpenseSchemas';

const LIST_PATH = '/fleet/fuel-loads';

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

const loadToValues = (load: FuelLoad): FuelLoadFormValues => ({
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
});

/** Alta (`/fleet/fuel-loads/new`, CU-195) y edición (`/fleet/fuel-loads/:id/edit`, CU-320) de una carga de combustible. */
export const FuelLoadForm = () => {
  const { id } = useParams<{ id: string }>();
  const { canWrite, writeHint } = usePermissions();
  if (canWrite) return <FuelLoadFormLoader id={id} />;
  const title = id ? 'Editar carga de combustible' : 'Nueva carga de combustible';
  return (
    <PageContainer size="sm">
      <PageHeader title={title} />
      <Card className="p-6">
        <EmptyState title="Elegí una distribuidora" description={writeHint} />
      </Card>
    </PageContainer>
  );
};

const FuelLoadFormLoader = ({ id }: { id?: string }) => {
  const { data: load, isPending, error, refetch } = useFuelLoad(id);
  // Los vehículos tienen que estar antes de dibujar el combo: un <select> no conserva un valor cuyas opciones llegan después.
  const cars = useCarOptions();
  const title = id ? 'Editar carga de combustible' : 'Nueva carga de combustible';
  useCrumbLeaf(id && load ? 'Editar' : undefined);

  const loading = cars.isPending || (Boolean(id) && isPending);
  const failure =
    cars.error && !cars.hasData
      ? { error: cars.error, resource: 'Los vehículos', retry: () => void cars.refetch() }
      : id && !load
        ? { error, resource: 'La carga', retry: () => void refetch() }
        : null;
  // Un error de recarga con datos en caché no desmonta el formulario: se avisa en línea y se puede reintentar.
  const warning = cars.error
    ? { text: 'No pudimos actualizar los vehículos.', retry: () => void cars.refetch() }
    : id && error
      ? { text: 'No pudimos actualizar la carga.', retry: () => void refetch() }
      : undefined;
  if (loading || failure) {
    return (
      <PageContainer size="sm">
        <PageHeader title={title} />
        {failure && !loading ? (
          <Card className="p-6">
            <ErrorState error={failure.error} resource={failure.resource} onRetry={failure.retry} />
          </Card>
        ) : (
          <LoadingState fullPage />
        )}
      </PageContainer>
    );
  }
  // `key`: al pasar de una edición a otra el formulario se arma de nuevo con el registro que corresponde.
  return <FuelLoadFormBody key={load?.fuelLoadId ?? 'new'} warning={warning} load={id ? load : undefined} />;
};

/** El formulario. Con `?carId=` (se abre desde la ficha de un vehículo) el vehículo queda fijo. */
const FuelLoadFormBody = ({ load, warning }: { load?: FuelLoad; warning?: LoadWarning }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fixedCarId = load ? undefined : (searchParams.get('carId') ?? undefined);
  const returnPath = useReturnPath(LIST_PATH);
  const isEditing = Boolean(load);
  // Una carga que ya salió de una caja no cambia de importe ni de medio de pago (la API responde 409).
  const locked = Boolean(load?.cashMovementId);
  const create = useCreateFuelLoad();
  const update = useUpdateFuelLoad();
  const { options: baseOptions } = useCarOptions('Elegí un vehículo');
  // En edición el vehículo actual siempre tiene su opción, aunque la lista no lo traiga.
  const currentCar = load;
  const carOptions =
    currentCar && !baseOptions.some((o) => o.value === currentCar.carId)
      ? [...baseOptions, { value: currentCar.carId, label: currentCar.carPatent ?? 'Vehículo actual' }]
      : baseOptions;
  const { data: cars } = useCars();
  const methods = useForm<FuelLoadFormValues>({
    resolver: zodResolver(fuelLoadSchema),
    defaultValues: load
      ? loadToValues(load)
      : { ...EMPTY, carId: fixedCarId ?? '', loadedAt: toLocalInput(new Date()) },
  });
  const { watch, setValue, getValues } = methods;

  const [cashBoxId, setCashBoxId] = useState('');
  const [touched, setTouched] = useState(false);
  const paysFromBox = !isEditing && watch('paymentMethod') === 'cash_box';
  const cashBoxes = useOrderCashBoxes(paysFromBox);
  const needsBox = paysFromBox && cashBoxes.required;
  const boxError = touched && needsBox && !cashBoxId ? 'Elegí la caja de la que sale el efectivo' : undefined;

  const guard = useUnsavedChangesGuard(methods.formState.isDirty || cashBoxId !== '');

  const carId = watch('carId');
  const liters = Number(watch('liters'));
  const unitPrice = Number(watch('unitPrice'));
  const correcting = watch('odometerCorrection');
  const car = cars?.find((c) => c.car_id === carId);
  const quote = useFuelLoadQuote(liters > 0 && unitPrice > 0 ? { liters, unitPrice } : null);
  const expected =
    liters > 0 && unitPrice > 0 && !quote.isError && !quote.stale ? (quote.data?.totalAmount ?? null) : null;
  const tankWarning =
    liters > 0 && car && !fuelFitsTank(liters, car.tank_capacity_liters)
      ? `Supera la capacidad del tanque (${car.tank_capacity_liters} L, con 5 % de tolerancia).`
      : undefined;

  // Sugiere el kilometraje de la última carga vigente del vehículo (CU-195, paso 2).
  const { data: last } = useFuelLoads({ page: 0, pageSize: 1 }, { carId }, { enabled: !isEditing && !!carId });
  const lastOdometer = last?.data[0]?.odometerKm;
  useEffect(() => {
    if (isEditing || lastOdometer === undefined) return;
    if (!Number(getValues('odometerKm'))) setValue('odometerKm', lastOdometer);
  }, [isEditing, lastOdometer, getValues, setValue]);

  const saving = create.isPending || update.isPending;

  const onSubmit = (values: FuelLoadFormValues) => {
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
        guard.release();
        navigate(returnPath, { replace: true });
      },
      onError: notify.error,
    };
    if (load) update.mutate({ id: load.fuelLoadId, body }, options);
    else
      create.mutate(
        { ...body, carId: values.carId, cashBoxId: paysFromBox && cashBoxId ? cashBoxId : undefined },
        options,
      );
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title={isEditing ? 'Editar carga de combustible' : 'Nueva carga de combustible'}
        description={
          isEditing
            ? `${load?.carPatent ?? 'Vehículo'} · se revalidan el importe y el kilometraje`
            : 'El kilometraje del vehículo se actualiza con la carga.'
        }
      />
      {warning && <FormLoadWarning text={warning.text} onRetry={warning.retry} />}
      <Form methods={methods} onSubmit={onSubmit} id="fuel-load-form" className="space-y-6">
        <FormSection title="Vehículo y combustible">
          <div className="sm:col-span-2">
            <FormSelect
              name="carId"
              label="Vehículo"
              required
              options={carOptions}
              disabled={isEditing || Boolean(fixedCarId)}
            />
          </div>
          <FormInput name="loadedAt" label="Fecha y hora" type="datetime-local" />
          <FormSelect
            name="fuelType"
            label="Combustible"
            options={[{ value: '', label: 'El del vehículo' }, ...FUEL_TYPE_OPTIONS]}
          />
          <div className="sm:col-span-2">
            <FormCheckbox
              name="isFullTank"
              label="Llenó el tanque"
              hint="El consumo se mide entre cargas de tanque lleno."
            />
          </div>
        </FormSection>
        <FormSection title="Litros e importe">
          <FormInput name="liters" label="Litros" type="number" step="0.01" min={0} required hint={tankWarning} />
          <FormInput name="unitPrice" label="Precio por litro" type="number" step="0.001" min={0} required />
          <div>
            <FormInput
              name="totalAmount"
              label="Importe total"
              type="number"
              step="0.01"
              min={0}
              required
              hint={expected === null ? undefined : `Litros × precio: ${formatCurrencyExact(expected)}`}
              disabled={locked}
            />
            {expected !== null && !locked && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => setValue('totalAmount', expected, { shouldValidate: true, shouldDirty: true })}
              >
                Usar el importe calculado
              </Button>
            )}
          </div>
          <FormInput name="station" label="Estación" maxLength={120} />
        </FormSection>
        <FormSection title="Kilometraje">
          <FormInput
            name="odometerKm"
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
          />
          <div className="space-y-3 sm:col-span-2">
            <FormCheckbox
              name="odometerCorrection"
              label="Corregir el kilometraje"
              hint="Sólo si el kilometraje es menor que el de la carga anterior (p. ej. se cambió el tablero). Queda con una nota."
            />
            {correcting && (
              <FormInput name="odometerCorrectionNote" label="Nota de la corrección" required maxLength={500} />
            )}
          </div>
        </FormSection>
        <FormSection title="Pago y comprobante">
          <FormSelect
            name="paymentMethod"
            label="Medio de pago"
            required
            options={FUEL_PAYMENT_OPTIONS}
            disabled={locked}
          />
          <FormInput name="receiptNumber" label="Comprobante" maxLength={40} placeholder="Nº de ticket o factura" />
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
        </FormSection>
        <FormSection title="Notas" columns={1}>
          <FormTextArea name="notes" label="Notas" maxLength={2000} />
        </FormSection>
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={saving}
          submitLabel={isEditing ? 'Guardar cambios' : 'Registrar carga'}
        />
      </Form>
    </PageContainer>
  );
};
