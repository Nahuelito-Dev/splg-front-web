import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { CustomerAccountDetail } from '../../../services/api/types';
import { useCashBoxOptions, useRegisterCustomerPayment } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { optionalText, parseMoney, positiveMoney } from '../financeSchemas';

const schema = z.object({
  amount: positiveMoney(),
  method: z.enum(['cash', 'transfer', 'card', 'mercadopago', 'check']),
  cashBoxId: z.string().min(1, 'Elegí la caja donde entra el pago'),
  description: optionalText(255),
});
type Values = z.infer<typeof schema>;

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'check', label: 'Cheque' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  account: CustomerAccountDetail;
}

/** Registrar el pago de un cliente en una caja (CU-237); se imputa a los cargos más viejos. */
export const CustomerPaymentModal = ({ open, onClose, account }: Props) => {
  const pay = useRegisterCustomerPayment();
  const boxes = useCashBoxOptions({ enabled: open });
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) {
      reset({
        amount: account.balance > 0 ? String(account.balance) : '',
        method: 'cash',
        cashBoxId: '',
        description: '',
      });
    }
  }, [open, account.balance, reset]);

  const onSubmit = (values: Values) =>
    pay.mutate(
      {
        id: account.accountId,
        body: {
          amount: parseMoney(values.amount),
          method: values.method,
          cashBoxId: values.cashBoxId,
          description: values.description || undefined,
        },
      },
      {
        onSuccess: () => {
          notify.success('Pago registrado');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pay.isPending}
      title="Registrar un pago"
      description={`Deuda actual: ${formatCurrency(account.balance)}. El pago entra a la caja y baja la deuda de los cargos más viejos.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-payment-form" loading={pay.isPending}>
            Registrar pago
          </Button>
        </>
      }
    >
      <Form methods={methods} id="customer-payment-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="amount" label="Importe" required inputMode="decimal" />
        <FormSelect name="method" label="Medio" options={METHODS} />
        <FormSelect
          name="cashBoxId"
          label="Caja"
          required
          options={[
            { value: '', label: 'Elegí una caja' },
            ...(boxes.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
          ]}
          hint="Si exige sesión, tiene que estar abierta."
        />
        <FormInput name="description" label="Detalle (opcional)" maxLength={255} />
      </Form>
    </Modal>
  );
};
