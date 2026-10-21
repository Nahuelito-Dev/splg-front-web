import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, IconButton, Modal, FormInput, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
import { useCreateTransfer, useStockBalances } from '../../../services/queries/stock';
import { useTruckStock } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import { findShortfalls } from '../stockAvailability';
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
  const methods = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema) });
  const { reset, watch, control, setError } = methods;
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
  const fromWarehouseId = watch('fromWarehouseId');
  const originFilter = mode === 'warehouses' ? { warehouseId: fromWarehouseId } : { carId };
  const balances = useStockBalances(originFilter, {
    enabled: open && Boolean(mode === 'warehouses' ? fromWarehouseId : carId),
  });

  const onSubmit = async (values: TransferFormValues) => {
    // Igual que el back: el origen no puede quedar con un saldo negativo.
    // Con los saldos de ahora; si no se pueden traer, decide el back (409).
    const freshBalances = (await balances.refetch()).data ?? balances.data;
    if (freshBalances) {
      const shortfalls = findShortfalls(
        freshBalances,
        values.items.map((item) => ({
          gasCylinderId: item.gasCylinderId,
          condition: item.condition,
          delta: -item.quantity,
        })),
      );
      if (shortfalls.size > 0) {
        shortfalls.forEach((message, index) => setError(`items.${index}.quantity`, { message }));
        return;
      }
    }
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
    );
  };

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
        <Form methods={methods} id="transfer-form" onSubmit={onSubmit} className="space-y-4">
          <FormSelect name="mode" label="Tipo" options={MODE_OPTIONS} />
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'warehouses' ? (
              <FormSelect
                name="fromWarehouseId"
                label="Desde el galpón"
                required
                options={withPlaceholder(warehouses.options)}
              />
            ) : (
              <FormSelect name="carId" label="Camión" required options={withPlaceholder(cars.options)} />
            )}
            <FormSelect
              name="toWarehouseId"
              label="Hacia el galpón"
              required
              options={withPlaceholder(warehouses.options)}
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
                  <FormSelect
                    name={`items.${index}.gasCylinderId`}
                    label="Tipo"
                    options={withPlaceholder(cylinders.options)}
                  />
                  <FormSelect name={`items.${index}.condition`} label="Condición" options={CONDITION_OPTIONS} />
                  <FormInput name={`items.${index}.quantity`} label="Cantidad" type="number" min={1} />
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
          <FormTextArea
            name="notes"
            label={mode === 'truck' ? 'Nota' : 'Nota (opcional)'}
            required={mode === 'truck'}
            maxLength={300}
          />
        </Form>
      )}
    </Modal>
  );
};
