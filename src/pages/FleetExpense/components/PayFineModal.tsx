import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { TrafficFine } from '../../../services/api/types';
import { usePayTrafficFine } from '../../../services/queries/fleetExpense';
import { toIsoDay } from '../../../utils/dates';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { payFineSchema, type PayFineFormValues } from '../fleetExpenseSchemas';

interface Props {
  fine: TrafficFine | null;
  onClose: () => void;
}

/** Registrar el pago de una multa (CU-199): la fecha y lo efectivamente pagado, que suele ser el pago voluntario. */
export const PayFineModal = ({ fine, onClose }: Props) => {
  const pay = usePayTrafficFine();
  const today = toIsoDay(new Date());
  const schema = useMemo(() => payFineSchema(today), [today]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayFineFormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (fine) reset({ paidAt: today, paidAmount: fine.voluntaryPaymentAmount ?? fine.amount });
  }, [fine, today, reset]);

  const onSubmit = handleSubmit((values) =>
    pay.mutate(
      { id: fine?.fineId ?? '', body: values },
      {
        onSuccess: () => {
          notify.success('Pago registrado');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={fine !== null}
      onClose={onClose}
      closeBlocked={pay.isPending}
      title="Registrar el pago"
      description={fine ? `Acta ${fine.actNumber} · ${formatCurrency(fine.amount)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pay.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="pay-fine-form" loading={pay.isPending}>
            Registrar pago
          </Button>
        </>
      }
    >
      <form id="pay-fine-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Input
          label="Fecha de pago"
          type="date"
          max={today}
          required
          error={errors.paidAt?.message}
          {...register('paidAt')}
        />
        <Input
          label="Importe pagado"
          type="number"
          step="0.01"
          min={0}
          required
          hint={
            fine?.voluntaryPaymentAmount
              ? `Con pago voluntario: ${formatCurrency(fine.voluntaryPaymentAmount)}`
              : undefined
          }
          error={errors.paidAmount?.message}
          {...register('paidAmount')}
        />
      </form>
    </Modal>
  );
};
