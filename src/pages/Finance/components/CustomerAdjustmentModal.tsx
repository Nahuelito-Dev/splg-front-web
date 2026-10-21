import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { CustomerAccountDetail } from '../../../services/api/types';
import { useRegisterCustomerAdjustment } from '../../../services/queries/finance';
import { notify } from '../../../utils/notifications';
import { parseMoney, positiveMoney, requiredText } from '../financeSchemas';

const schema = z.object({
  kind: z.enum(['credit', 'debit'], { message: 'Elegí el tipo' }),
  amount: positiveMoney(),
  reason: requiredText('Escribí el motivo', 255),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  account: CustomerAccountDetail;
}

/** Nota de crédito o de débito (CU-329): el libro no se edita, un error se corrige con un ajuste. */
export const CustomerAdjustmentModal = ({ open, onClose, account }: Props) => {
  const adjust = useRegisterCustomerAdjustment();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ kind: 'credit', amount: '', reason: '' });
  }, [open, reset]);

  const onSubmit = (values: Values) =>
    adjust.mutate(
      { id: account.accountId, body: { kind: values.kind, amount: parseMoney(values.amount), reason: values.reason } },
      {
        onSuccess: () => {
          notify.success('Ajuste registrado');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={adjust.isPending}
      title="Registrar un ajuste"
      description="La nota de crédito baja la deuda del cliente; la de débito la sube."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-adjustment-form" loading={adjust.isPending}>
            Registrar ajuste
          </Button>
        </>
      }
    >
      <Form methods={methods} id="customer-adjustment-form" onSubmit={onSubmit} className="grid gap-4">
        <FormSelect
          name="kind"
          label="Tipo"
          options={[
            { value: 'credit', label: 'Nota de crédito (baja la deuda)' },
            { value: 'debit', label: 'Nota de débito (sube la deuda)' },
          ]}
        />
        <FormInput name="amount" label="Importe" required inputMode="decimal" />
        <FormInput name="reason" label="Motivo" required maxLength={255} />
      </Form>
    </Modal>
  );
};
