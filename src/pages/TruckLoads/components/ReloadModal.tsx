import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, IconButton, Modal, FormInput, FormSelect, Form, FormError } from '../../../common/components/ui';
import type { TruckLoad } from '../../../services/api/types';
import { useReloadTruckLoad } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import { useCylinderOptions, withPlaceholder } from '../../Stock/components/useStockOptions';
import { reloadSchema, type ReloadFormValues } from './truckLoadSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  load: TruckLoad;
}

/** Reposición en ruta: más llenas del galpón al camión. La clave de idempotencia es obligatoria: repetirla sumaría otra vez. */
export const ReloadModal = ({ open, onClose, load }: Props) => {
  const cylinders = useCylinderOptions();
  const reload = useReloadTruckLoad();
  const scope = `reload:${load.loadId}`;
  const methods = useForm<ReloadFormValues>({ resolver: zodResolver(reloadSchema) });
  const { reset, control } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) reset({ items: [{ gasCylinderId: '', quantity: 1 }] });
  }, [open, reset]);

  const onSubmit = (values: ReloadFormValues) =>
    reload.mutate(
      { id: load.loadId, body: { items: values.items }, scope },
      {
        onSuccess: () => {
          notify.success('Reposición registrada');
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
      title={`Reponer la carga N° ${load.number}`}
      description={`Pasan llenas de ${load.originName} al camión ${load.carPatent ?? ''}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="reload-form" loading={reload.isPending} disabled={cylinders.failed}>
            Reponer
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
        <Form methods={methods} id="reload-form" onSubmit={onSubmit} className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-start">
              <FormSelect
                name={`items.${index}.gasCylinderId`}
                label="Tipo"
                options={withPlaceholder(cylinders.options)}
              />
              <FormInput name={`items.${index}.quantity`} label="Llenas a reponer" type="number" min={1} />
              {fields.length > 1 && (
                <IconButton
                  label={`Quitar garrafa ${index + 1}`}
                  icon={<Trash2 />}
                  className="sm:mt-7"
                  onClick={() => remove(index)}
                />
              )}
            </div>
          ))}
          <FormError name="items.root" />
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus />}
            onClick={() => append({ gasCylinderId: '', quantity: 1 })}
          >
            Agregar otra garrafa
          </Button>
        </Form>
      )}
    </Modal>
  );
};
