import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, IconButton, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import { useCreateTransfer } from '../../../services/queries/stock';
import { useTruckStock } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import { STOCK_CONDITION } from '../../../utils/statusLabels';
import { transferSchema, type TransferFormValues } from './transferSchema';
import { useCarOptions, useCylinderOptions, useWarehouseOptions, withPlaceholder } from './useStockOptions';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS = [
  { value: 'warehouses', label: 'Entre galpones' },
  { value: 'truck', label: 'Camión → galpón (regularizar)' },
];
const CONDITION_OPTIONS = (['full', 'empty', 'defective'] as const).map((c) => ({
  value: c,
  label: STOCK_CONDITION[c].text,
}));
const EMPTY_ITEM = { gasCylinderId: '', condition: 'full', quantity: 1 } as const;

/** Transferencia entre galpones, o camión → galpón sólo para regularizar un camión sin carga abierta. */
export const TransferFormModal = ({ open, onClose }: Props) => {
  const warehouses = useWarehouseOptions();
  const cylinders = useCylinderOptions();
  const cars = useCarOptions();
  const create = useCreateTransfer();
  const scope = 'transfer:new';
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema) });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) {
      reset({
        mode: 'warehouses',
        fromWarehouseId: '',
        carId: '',
        toWarehouseId: '',
        notes: '',
        items: [{ ...EMPTY_ITEM }],
      });
    }
  }, [open, reset]);

  const mode = watch('mode');
  const carId = watch('carId');
  const truck = useTruckStock(mode === 'truck' ? carId : undefined);
  const openLoad = truck.data?.openLoadId ?? null;

  const onSubmit = handleSubmit((values) =>
    create.mutate(
      {
        scope,
        body: {
          from: values.mode === 'warehouses' ? { warehouseId: values.fromWarehouseId } : { carId: values.carId },
          to: { warehouseId: values.toWarehouseId },
          notes: values.notes || undefined,
          items: values.items,
        },
      },
      {
        onSuccess: () => {
          notify.success('Transferencia registrada');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  const loadFailed = warehouses.failed || cylinders.failed || cars.failed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Nueva transferencia"
      description="Mové garrafas entre galpones. El camión se carga y se rinde desde «Cargas del camión»."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="transfer-form"
            loading={create.isPending}
            disabled={loadFailed || (mode === 'truck' && (openLoad !== null || truck.isPending || truck.isError))}
          >
            Transferir
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los galpones, camiones o garrafas.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              void warehouses.refetch();
              void cylinders.refetch();
              void cars.refetch();
            }}
          >
            Reintentar
          </button>
        </p>
      ) : (
        <form id="transfer-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <Select label="Tipo" options={MODE_OPTIONS} {...register('mode')} />
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'warehouses' ? (
              <Select
                label="Desde el galpón"
                required
                options={withPlaceholder(warehouses.options)}
                error={errors.fromWarehouseId?.message}
                {...register('fromWarehouseId')}
              />
            ) : (
              <Select
                label="Camión"
                required
                options={withPlaceholder(cars.options)}
                error={errors.carId?.message}
                {...register('carId')}
              />
            )}
            <Select
              label="Hacia el galpón"
              required
              options={withPlaceholder(warehouses.options)}
              error={errors.toWarehouseId?.message}
              {...register('toWarehouseId')}
            />
          </div>
          {mode === 'truck' && carId && (
            <div className="rounded-lg border border-outline bg-surface-hover px-3 py-2 text-sm" aria-live="polite">
              {truck.isPending ? (
                'Consultando el stock del camión…'
              ) : truck.isError ? (
                <span className="text-danger">No se pudo consultar el stock del camión.</span>
              ) : openLoad ? (
                <span className="text-danger">
                  Este camión tiene una carga abierta: su stock se devuelve rindiendo la carga, no con una
                  transferencia.
                </span>
              ) : truck.data.items.length === 0 ? (
                'El camión no tiene garrafas.'
              ) : (
                <>
                  Tiene ahora:{' '}
                  {truck.data.items
                    .map((i) => `${i.gasCylinderType} (${i.full} llenas, ${i.empty} vacías, ${i.defective} defect.)`)
                    .join(' · ')}
                </>
              )}
            </div>
          )}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
                <legend className="px-1 text-xs font-medium text-muted">Garrafa {index + 1}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr_0.8fr_auto] sm:items-start">
                  <Select
                    label="Tipo"
                    options={withPlaceholder(cylinders.options)}
                    error={errors.items?.[index]?.gasCylinderId?.message}
                    {...register(`items.${index}.gasCylinderId`)}
                  />
                  <Select label="Condición" options={CONDITION_OPTIONS} {...register(`items.${index}.condition`)} />
                  <Input
                    label="Cantidad"
                    type="number"
                    min={1}
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`)}
                  />
                  {fields.length > 1 && (
                    <IconButton
                      label={`Quitar garrafa ${index + 1}`}
                      icon={<Trash2 />}
                      className="sm:mt-7"
                      onClick={() => remove(index)}
                    />
                  )}
                </div>
              </fieldset>
            ))}
            <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => append({ ...EMPTY_ITEM })}>
              Agregar otra garrafa
            </Button>
          </div>
          <TextArea
            label={mode === 'truck' ? 'Nota' : 'Nota (opcional)'}
            required={mode === 'truck'}
            maxLength={300}
            error={errors.notes?.message}
            {...register('notes')}
          />
        </form>
      )}
    </Modal>
  );
};
