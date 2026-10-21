import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Modal, FormInput, FormTextArea, Form } from '../../../common/components/ui';
import type { GasCylinder } from '../../../services/api/types';
import { useCreateGasCylinder, useUpdateGasCylinder } from '../../../services/queries/gasCylinders';
import { notify } from '../../../utils/notifications';
import { gasCylinderSchema, type GasCylinderFormValues } from './gasCylinderSchema';
import { PromotionsFieldArray } from './PromotionsFieldArray';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con producto es edición; sin producto, alta. */
  cylinder: GasCylinder | null;
}

const emptyValues: GasCylinderFormValues = { type: '', weight: 0, price: 0, stock: 0, description: '', promotions: [] };

export const CylinderFormModal = ({ open, onClose, cylinder }: Props) => {
  const createCylinder = useCreateGasCylinder();
  const updateCylinder = useUpdateGasCylinder();
  const methods = useForm<GasCylinderFormValues>({ resolver: zodResolver(gasCylinderSchema) });
  const { reset, control } = methods;

  const price = useWatch({ control, name: 'price' });

  useEffect(() => {
    if (!open) return;
    reset(
      cylinder
        ? {
            type: cylinder.type,
            weight: cylinder.weight,
            price: cylinder.price,
            stock: cylinder.stock,
            description: cylinder.description ?? '',
            promotions: cylinder.promotions ?? [],
          }
        : emptyValues,
    );
  }, [open, cylinder, reset]);

  const saving = createCylinder.isPending || updateCylinder.isPending;

  const onSubmit = (values: GasCylinderFormValues) => {
    const base = {
      type: values.type,
      weight: values.weight,
      price: values.price,
      description: values.description || undefined,
      promotions: values.promotions,
    };
    const onSuccess = () => {
      notify.success(cylinder ? 'Producto actualizado' : 'Producto creado');
      onClose();
    };
    if (cylinder) {
      // El stock no se edita acá: la API responde 400 si llega. Se ajusta desde "Ajustar stock".
      updateCylinder.mutate({ id: cylinder.gas_cylinder_id, body: base }, { onSuccess, onError: notify.error });
    } else {
      createCylinder.mutate({ ...base, stock: values.stock }, { onSuccess, onError: notify.error });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cylinder ? 'Editar producto' : 'Nueva garrafa'}
      description={cylinder ? undefined : 'El tipo tiene que ser único en tu distribuidora.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="gas-cylinder-form" loading={saving}>
            {cylinder ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="gas-cylinder-form" onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput name="type" label="Tipo" required placeholder="Ej: 10kg" />
          <FormInput name="weight" label="Peso (kg)" required type="number" step="0.01" />
          <FormInput name="price" label="Precio ($)" required type="number" step="0.01" />
          {cylinder ? null : (
            <FormInput
              name="stock"
              label="Stock inicial"
              required
              type="number"
              hint="Queda como stock lleno del depósito central. Después se cambia con “Ajustar stock”."
            />
          )}
        </div>
        <FormTextArea name="description" label="Descripción" />
        <PromotionsFieldArray price={Number(price) || 0} />
      </Form>
    </Modal>
  );
};
