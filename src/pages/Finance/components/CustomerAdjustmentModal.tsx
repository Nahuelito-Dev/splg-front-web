import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ kind: 'credit', amount: '', reason: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) =>
    adjust.mutate(
      { id: account.accountId, body: { kind: values.kind, amount: parseMoney(values.amount), reason: values.reason } },
      {
        onSuccess: () => {
          notify.success('Ajuste registrado');
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
      <form id="customer-adjustment-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Select
          label="Tipo"
          options={[
            { value: 'credit', label: 'Nota de crédito (baja la deuda)' },
            { value: 'debit', label: 'Nota de débito (sube la deuda)' },
          ]}
          error={errors.kind?.message}
          {...register('kind')}
        />
        <Input label="Importe" required inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
        <Input label="Motivo" required maxLength={255} error={errors.reason?.message} {...register('reason')} />
      </form>
    </Modal>
  );
};
