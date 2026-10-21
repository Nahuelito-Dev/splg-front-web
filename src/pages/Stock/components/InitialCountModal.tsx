import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormTextArea, Form } from '../../../common/components/ui';
import type { WarehouseDetail } from '../../../services/api/types';
import { useCreateInitialCount } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';
import { pivotBalances } from '../stockMath';
import { initialCountSchema, type InitialCountFormValues } from './initialCountSchema';
import { useCylinderOptions } from './useStockOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  warehouse: WarehouseDetail;
}

/** Conteo inicial de un galpón: se hace una sola vez y registra las diferencias contra el saldo actual. */
export const InitialCountModal = ({ open, onClose, warehouse }: Props) => {
  const cylinders = useCylinderOptions();
  const create = useCreateInitialCount();
  const scope = `count:${warehouse.warehouseId}`;
  const methods = useForm<InitialCountFormValues>({ resolver: zodResolver(initialCountSchema) });
  const { reset, control } = methods;
  const { fields } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open || cylinders.loading) return;
    const current = new Map(pivotBalances(warehouse.balances).map((r) => [r.gasCylinderId, r]));
    reset({
      notes: '',
      items: cylinders.options.map((c) => ({
        gasCylinderId: c.value,
        type: c.label,
        full: current.get(c.value)?.full ?? 0,
        empty: current.get(c.value)?.empty ?? 0,
        defective: current.get(c.value)?.defective ?? 0,
      })),
    });
  }, [open, cylinders.loading, cylinders.options, warehouse.balances, reset]);

  const onSubmit = (values: InitialCountFormValues) =>
    create.mutate(
      {
        scope,
        body: {
          warehouseId: warehouse.warehouseId,
          notes: values.notes || undefined,
          items: values.items.map(({ gasCylinderId, full, empty, defective }) => ({
            gasCylinderId,
            full,
            empty,
            defective,
          })),
        },
      },
      {
        onSuccess: () => {
          notify.success('Conteo inicial registrado');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Conteo inicial · ${warehouse.name}`}
      description="Cargá lo que hay físicamente. Se hace una sola vez por galpón: después, los cambios son ajustes."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="initial-count-form" loading={create.isPending}>
            Registrar conteo
          </Button>
        </>
      }
    >
      {cylinders.failed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar el catálogo de garrafas.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void cylinders.refetch()}>
            Reintentar
          </button>
        </p>
      ) : (
        <Form methods={methods} id="initial-count-form" onSubmit={onSubmit} className="space-y-4">
          {fields.map((field, index) => (
            <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
              <legend className="px-1 text-sm font-semibold text-ink">{field.type}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormInput name={`items.${index}.full`} label="Llenas" type="number" min={0} />
                <FormInput name={`items.${index}.empty`} label="Vacías" type="number" min={0} />
                <FormInput name={`items.${index}.defective`} label="Defectuosas" type="number" min={0} />
              </div>
            </fieldset>
          ))}
          <FormTextArea name="notes" label="Nota (opcional)" maxLength={300} />
        </Form>
      )}
    </Modal>
  );
};
