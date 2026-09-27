import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
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
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<GasCylinderFormValues>({ resolver: zodResolver(gasCylinderSchema) });

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

  const onSubmit = handleSubmit((values) => {
    const body = {
      type: values.type,
      weight: values.weight,
      price: values.price,
      stock: values.stock,
      description: values.description || undefined,
      promotions: values.promotions,
    };
    const onSuccess = () => {
      notify.success(cylinder ? 'Producto actualizado' : 'Producto creado');
      onClose();
    };
    if (cylinder) {
      updateCylinder.mutate({ id: cylinder.gas_cylinder_id, body }, { onSuccess, onError: notify.error });
    } else {
      createCylinder.mutate(body, { onSuccess, onError: notify.error });
    }
  });

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
      <form id="gas-cylinder-form" onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tipo" required placeholder="Ej: 10kg" error={errors.type?.message} {...register('type')} />
          <Input
            label="Peso (kg)"
            required
            type="number"
            step="0.01"
            error={errors.weight?.message}
            {...register('weight')}
          />
          <Input
            label="Precio ($)"
            required
            type="number"
            step="0.01"
            error={errors.price?.message}
            {...register('price')}
          />
          <Input label="Stock" required type="number" error={errors.stock?.message} {...register('stock')} />
        </div>
        <TextArea label="Descripción" error={errors.description?.message} {...register('description')} />
        <PromotionsFieldArray control={control} register={register} errors={errors} price={Number(price) || 0} />
      </form>
    </Modal>
  );
};
