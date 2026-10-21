import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  IconButton,
  Modal,
  FormInput,
  FormSelect,
  FormTextArea,
  Form,
  FormError,
} from '../../../common/components/ui';
import type { StockAdjustment } from '../../../services/api/types';
import { useCreateAdjustment, useStockBalances, useStockLocations } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';
import { ADJUSTMENT_REASON, MANUAL_ADJUSTMENT_REASONS, STOCK_CONDITION } from '../../../utils/statusLabels';
import { adjustmentCondition, adjustmentDelta } from '../stockMath';
import { findShortfalls } from '../stockAvailability';
import { adjustmentSchema, type AdjustmentFormValues } from './adjustmentSchema';
import { useCylinderOptions, withPlaceholder } from './useStockOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con el ajuste ya creado se va a su detalle, donde se adjunta la foto o el acta. */
  onCreated: (adjustment: StockAdjustment) => void;
}

const REASON_OPTIONS = MANUAL_ADJUSTMENT_REASONS.map((r) => ({ value: r, label: ADJUSTMENT_REASON[r].text }));
const CONDITION_OPTIONS = (['full', 'empty', 'defective'] as const).map((c) => ({
  value: c,
  label: STOCK_CONDITION[c].text,
}));

const EMPTY_ITEM = { gasCylinderId: '', condition: 'full', amount: 1 } as const;

/** Alta de un ajuste de stock (merma, fuga, rotura, pérdida, encontrado o corrección) con nota obligatoria. */
export const AdjustmentFormModal = ({ open, onClose, onCreated }: Props) => {
  const locations = useStockLocations();
  const cylinders = useCylinderOptions();
  const create = useCreateAdjustment();
  const scope = 'adjustment:new';
  const methods = useForm<AdjustmentFormValues>({ resolver: zodResolver(adjustmentSchema) });
  const { reset, watch, control, setError } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) reset({ locationId: '', reason: 'shrinkage', notes: '', items: [{ ...EMPTY_ITEM }] });
  }, [open, reset]);

  const reason = watch('reason');
  const locationId = watch('locationId');
  const balances = useStockBalances({ locationId }, { enabled: open && Boolean(locationId) });
  const locationOptions = withPlaceholder(
    (locations.data ?? []).map((l) => ({
      value: l.locationId,
      label: `${l.kind === 'warehouse' ? 'Galpón' : 'Camión'} · ${l.name}`,
    })),
    'Elegí la ubicación',
  );

  const onSubmit = async (values: AdjustmentFormValues) => {
    const location = (locations.data ?? []).find((l) => l.locationId === values.locationId);
    if (!location) return;
    // Igual que el back: ningún saldo de la ubicación puede quedar en negativo.
    // Con los saldos de ahora; si no se pueden traer, decide el back (409).
    const freshBalances = (await balances.refetch()).data ?? balances.data;
    if (freshBalances) {
      const shortfalls = findShortfalls(
        freshBalances,
        values.items.map((item) => ({
          gasCylinderId: item.gasCylinderId,
          condition: adjustmentCondition(values.reason, item.condition),
          delta: adjustmentDelta(values.reason, item.amount),
        })),
      );
      if (shortfalls.size > 0) {
        shortfalls.forEach((message, index) => setError(`items.${index}.amount`, { message }));
        return;
      }
    }
    create.mutate(
      {
        scope,
        body: {
          location:
            location.kind === 'warehouse'
              ? { warehouseId: location.warehouseId ?? undefined }
              : { carId: location.carId ?? undefined },
          reason: values.reason,
          notes: values.notes,
          items: values.items.map((item) => ({
            gasCylinderId: item.gasCylinderId,
            condition: adjustmentCondition(values.reason, item.condition),
            quantityDelta: adjustmentDelta(values.reason, item.amount),
          })),
        },
      },
      {
        onSuccess: (adjustment) => {
          notify.success(`Ajuste N° ${adjustment.number} registrado`);
          onClose();
          onCreated(adjustment);
        },
        onError: notify.error,
      },
    );
  };

  const loadFailed = locations.isError || cylinders.failed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Nuevo ajuste de stock"
      description="Registrá una merma, fuga, rotura, pérdida, lo encontrado o una corrección de conteo. Después podés adjuntar la foto o el acta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="adjustment-form" loading={create.isPending} disabled={loadFailed}>
            Registrar ajuste
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar las ubicaciones o las garrafas.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              void locations.refetch();
              void cylinders.refetch();
            }}
          >
            Reintentar
          </button>
        </p>
      ) : (
        <Form methods={methods} id="adjustment-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect name="locationId" label="Ubicación" required options={locationOptions} />
            <FormSelect
              name="reason"
              label="Motivo"
              required
              options={REASON_OPTIONS}
              hint={reason === 'damaged' ? 'Las llenas pasan a defectuosas en la misma ubicación.' : undefined}
            />
          </div>
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
                  {reason !== 'damaged' && (
                    <FormSelect name={`items.${index}.condition`} label="Condición" options={CONDITION_OPTIONS} />
                  )}
                  <FormInput
                    name={`items.${index}.amount`}
                    label={reason === 'count_correction' ? 'Diferencia (+/−)' : 'Cantidad'}
                    type="number"
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
            <FormError name="items" />
            <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => append({ ...EMPTY_ITEM })}>
              Agregar otra garrafa
            </Button>
          </div>
          <FormTextArea name="notes" label="Nota" required maxLength={300} placeholder="Qué pasó y cómo se detectó" />
        </Form>
      )}
    </Modal>
  );
};
