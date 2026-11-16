import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
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
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, setError } = methods;

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

  const onSubmit = async (values: Values) => {
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
  };

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
      <Form methods={methods} id="transfer-form" onSubmit={onSubmit} className="grid gap-4">
        <FormSelect name="fromCashBoxId" label="Desde" required options={options} />
        <FormSelect name="toCashBoxId" label="Hacia" required options={options} />
        <FormInput name="amount" label="Importe" required inputMode="decimal" />
        <FormInput name="description" label="Nota (opcional)" maxLength={255} />
      </Form>
    </Modal>
  );
};
