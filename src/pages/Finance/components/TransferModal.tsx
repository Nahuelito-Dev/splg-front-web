import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import { useCashBoxOptions, useTransferCash } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { insufficientCashMessage, optionalText, parseMoney, positiveMoney } from '../financeSchemas';

const schema = z
  .object({
    fromCashBoxId: z.string().min(1, 'Elegí la caja de origen'),
    toCashBoxId: z.string().min(1, 'Elegí la caja de destino'),
    amount: positiveMoney(),
    description: optionalText(255),
  })
  .refine((v) => v.fromCashBoxId !== v.toCashBoxId, {
    path: ['toCashBoxId'],
    message: 'El destino tiene que ser otra caja',
  });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Transferir fondos entre cajas (CU-310): salida y entrada en una sola operación. */
export const TransferModal = ({ open, onClose }: Props) => {
  const transfer = useTransferCash();
  const boxes = useCashBoxOptions({ enabled: open });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ fromCashBoxId: '', toCashBoxId: '', amount: '', description: '' });
  }, [open, reset]);

  const options = [
    { value: '', label: 'Elegí una caja' },
    ...(boxes.data?.data ?? []).map((b) => ({
      value: b.cashBoxId,
      label: `${b.name} · ${formatCurrency(b.balance)}`,
    })),
  ];

  const onSubmit = handleSubmit(async (values) => {
    // Con el saldo de ahora; si no se puede traer, decide el back (409).
    const fresh = (await boxes.refetch()).data ?? boxes.data;
    const origin = fresh?.data.find((b) => b.cashBoxId === values.fromCashBoxId);
    const insufficient = insufficientCashMessage(origin, parseMoney(values.amount));
    if (insufficient) {
      setError('amount', { message: insufficient });
      return;
    }
    transfer.mutate(
      {
        fromCashBoxId: values.fromCashBoxId,
        toCashBoxId: values.toCashBoxId,
        amount: parseMoney(values.amount),
        description: values.description || undefined,
      },
      {
        onSuccess: () => {
          notify.success('Transferencia registrada');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={transfer.isPending}
      title="Transferir entre cajas"
      description="Sale de una caja y entra a la otra al mismo tiempo: o se registran las dos o ninguna."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="transfer-form" loading={transfer.isPending}>
            Transferir
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Select
          label="Desde"
          required
          options={options}
          error={errors.fromCashBoxId?.message}
          {...register('fromCashBoxId')}
        />
        <Select
          label="Hacia"
          required
          options={options}
          error={errors.toCashBoxId?.message}
          {...register('toCashBoxId')}
        />
        <Input label="Importe" required inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
        <Input
          label="Nota (opcional)"
          maxLength={255}
          error={errors.description?.message}
          {...register('description')}
        />
      </form>
    </Modal>
  );
};
