import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormTextArea, Form } from '../../../common/components/ui';
import type { CatalogCylinder } from '../../../services/api/gasCylinders';
import { useCreateGasCylinder, useUpdateGasCylinder } from '../../../services/queries/gasCylinders';
import { notify } from '../../../utils/notifications';
import { gasCylinderSchema, type GasCylinderFormValues } from './gasCylinderSchema';
import { PromotionsFieldArray } from './PromotionsFieldArray';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con producto es edición; sin producto, alta. */
  cylinder: CatalogCylinder | null;
}

const emptyValues: GasCylinderFormValues = {
  type: '',
  weight: 0,
  price: 0,
  container_price: null,
  stock: 0,
  description: '',
  promotions: [],
};

export const CylinderFormModal = ({ open, onClose, cylinder }: Props) => {
  const createCylinder = useCreateGasCylinder();
  const updateCylinder = useUpdateGasCylinder();
  const methods = useForm<GasCylinderFormValues>({ resolver: zodResolver(gasCylinderSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset(
      cylinder
        ? {
            type: cylinder.type,
            weight: cylinder.weight,
            price: cylinder.price,
            container_price: cylinder.container_price ?? null,
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
      // El precio del envase sólo viaja si cambió: así no pisa el que haya cargado otro admin mientras tanto.
      const containerPriceChanged = values.container_price !== (cylinder.container_price ?? null);
      const body = containerPriceChanged ? { ...base, container_price: values.container_price } : base;
      updateCylinder.mutate({ id: cylinder.gas_cylinder_id, body }, { onSuccess, onError: notify.error });
    } else {
      createCylinder.mutate(
        { ...base, container_price: values.container_price, stock: values.stock },
        { onSuccess, onError: notify.error },
      );
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
          <FormInput
            name="container_price"
            label="Precio del envase ($)"
            type="number"
            step="0.01"
            hint="Se cobra cuando el cliente pide más garrafas que los envases que tiene. Vacío: sin precio."
          />
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
        <PromotionsFieldArray />
      </Form>
    </Modal>
  );
};
