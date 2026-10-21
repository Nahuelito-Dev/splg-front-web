import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import type { GasCylinder } from '../../../services/api/types';
import { negativeStockMessage } from './stockAdjust';
import { useGasCylinder, useUpdateGasCylinderStock } from '../../../services/queries/gasCylinders';
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
  const current = useGasCylinder(cylinder?.gas_cylinder_id);
  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 0 } });
  const { reset, setError } = methods;

  useEffect(() => {
    if (open) reset({ quantity: 0 });
  }, [open, reset]);

  if (!cylinder) return null;

  const onSubmit = async ({ quantity }: FormValues) => {
    // Con el stock de ahora; si no se puede traer, decide el back (400).
    const stock = (await current.refetch()).data?.stock ?? cylinder.stock;
    const negative = negativeStockMessage(stock, quantity);
    if (negative) {
      setError('quantity', { message: negative });
      return;
    }
    updateStock.mutate(
      { id: cylinder.gas_cylinder_id, body: { quantity } },
      {
        onSuccess: () => {
          notify.success(`Se ajustaron ${quantity} unidades`);
          onClose();
        },
        onError: notify.error,
      },
    );
  };

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
      <Form methods={methods} id="stock-adjust-form" onSubmit={onSubmit}>
        <FormInput
          name="quantity"
          label="Cantidad a sumar (o restar con signo negativo)"
          type="number"
          required
          hint="Ej: 50 para ingresar mercadería, -10 para dar de baja unidades dañadas."
        />
      </Form>
    </Modal>
  );
};
