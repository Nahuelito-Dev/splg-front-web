import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { GasCylinder } from '../../../services/api/types';
import { useUpdateGasCylinderStock } from '../../../services/queries/gasCylinders';
import { notify } from '../../../utils/notifications';

const schema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un entero')
    .refine((n) => n !== 0, 'Ingresá una cantidad distinta de 0'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cylinder: GasCylinder | null;
}

/** Ingreso o egreso de mercadería: suma (positivo) o resta (negativo) del stock actual. */
export const StockAdjustModal = ({ open, onClose, cylinder }: Props) => {
  const updateStock = useUpdateGasCylinderStock();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 0 } });

  useEffect(() => {
    if (open) reset({ quantity: 0 });
  }, [open, reset]);

  if (!cylinder) return null;

  const onSubmit = handleSubmit(({ quantity }) =>
    updateStock.mutate(
      { id: cylinder.gas_cylinder_id, body: { quantity } },
      {
        onSuccess: () => {
          notify.success(`Se ajustaron ${quantity} unidades`);
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar stock"
      description={`${cylinder.type} · stock actual: ${cylinder.stock} u.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-adjust-form" loading={updateStock.isPending}>
            Ajustar
          </Button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={(e) => void onSubmit(e)} noValidate>
        <Input
          label="Cantidad a sumar (o restar con signo negativo)"
          type="number"
          required
          hint="Ej: 50 para ingresar mercadería, -10 para dar de baja unidades dañadas."
          error={errors.quantity?.message}
          {...register('quantity')}
        />
      </form>
    </Modal>
  );
};
