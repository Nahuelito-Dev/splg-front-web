import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal } from '../../../common/components/ui';
import type { TrafficFine } from '../../../services/api/types';
import { usePayTrafficFine } from '../../../services/queries/fleetExpense';
import { CashBoxField } from '../../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../../Orders/components/useOrderCashBoxes';
import { argentinaDay, formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { payFineSchema, type PayFineFormValues } from '../fleetExpenseSchemas';

interface Props {
  fine: TrafficFine | null;
  onClose: () => void;
}

/** Registrar el pago de una multa (CU-199): la fecha y lo efectivamente pagado, que suele ser el pago voluntario. */
export const PayFineModal = ({ fine, onClose }: Props) => {
  const pay = usePayTrafficFine();
  const today = argentinaDay(new Date());
  const occurredAt = fine?.occurredAt;
  const schema = useMemo(() => payFineSchema(today, occurredAt), [today, occurredAt]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PayFineFormValues>({ resolver: zodResolver(schema) });
  const [cashBoxId, setCashBoxId] = useState('');
  const [touched, setTouched] = useState(false);
  const paidInCash = watch('paidInCash');
  const cashBoxes = useOrderCashBoxes(fine !== null && paidInCash === true);
  const needsBox = paidInCash === true && cashBoxes.required;
  const boxError = touched && needsBox && !cashBoxId ? 'Elegí la caja de la que sale el efectivo' : undefined;

  useEffect(() => {
    if (!fine) return;
    reset({ paidAt: today, paidAmount: fine.voluntaryPaymentAmount ?? fine.amount, paidInCash: false });
    setCashBoxId('');
    setTouched(false);
  }, [fine, today, reset]);

  const onSubmit = handleSubmit((values) => {
    setTouched(true);
    if (values.paidInCash && (cashBoxes.loading || cashBoxes.failed)) {
      notify.error(new Error('No pudimos cargar las cajas: probá de nuevo'));
      return;
    }
    if (needsBox && !cashBoxId) return;
    pay.mutate(
      {
        id: fine?.fineId ?? '',
        body: {
          paidAt: values.paidAt,
          paidAmount: values.paidAmount,
          ...(values.paidInCash ? { paidInCash: true, cashBoxId: cashBoxId || undefined } : {}),
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
  });

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
        <Checkbox
          label="Se pagó en efectivo de una caja"
          hint="El importe pagado sale de la caja que elijas."
          {...register('paidInCash')}
        />
        {paidInCash && (
          <CashBoxField
            boxes={cashBoxes.boxes}
            value={cashBoxId}
            onChange={setCashBoxId}
            error={boxError}
            hint="El efectivo sale de esta caja. Si exige sesión, tiene que estar abierta."
          />
        )}
      </form>
    </Modal>
  );
};
