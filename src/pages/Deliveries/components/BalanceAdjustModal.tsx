import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { useUpdateDeliveryBalance } from '../../../services/queries/deliveries';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

/** La API acota el ajuste a ±1.000.000 con hasta dos decimales. */
const schema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .refine((n) => n !== 0, 'Ingresá un monto distinto de 0')
    .refine((n) => Math.abs(n) <= 1_000_000, 'El monto no puede superar ±1.000.000')
    .refine((n) => Math.round(n * 100) === n * 100, 'Hasta dos decimales'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

/** CU-049: liquidación o descuento manual sobre el saldo del chofer. */
export const BalanceAdjustModal = ({ open, onClose, delivery }: Props) => {
  const updateBalance = useUpdateDeliveryBalance();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { amount: 0 } });

  useEffect(() => {
    if (open) reset({ amount: 0 });
  }, [open, reset]);

  if (!delivery) return null;

  const onSubmit = handleSubmit(({ amount }) =>
    updateBalance.mutate(
      { id: delivery.delivery_id, amount },
      {
        onSuccess: () => {
          notify.success(`Saldo ajustado en ${formatCurrency(amount)}`);
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
      title="Ajustar saldo"
      description={`${delivery.user?.full_name ?? 'El chofer'} · saldo actual: ${formatCurrency(delivery.balance)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="balance-adjust-form" loading={updateBalance.isPending}>
            Ajustar
          </Button>
        </>
      }
    >
      <form id="balance-adjust-form" onSubmit={(e) => void onSubmit(e)} noValidate>
        <Input
          label="Monto a acreditar (o descontar con signo negativo)"
          type="number"
          step="0.01"
          required
          hint="Ej: 15000 para liquidar ganancias, -3000 para descontar un adelanto."
          error={errors.amount?.message}
          {...register('amount')}
        />
      </form>
    </Modal>
  );
};
