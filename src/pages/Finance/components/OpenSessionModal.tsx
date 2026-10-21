import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import type { CashBox } from '../../../services/api/types';
import { useOpenCashSession } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { nonNegativeMoney, parseMoney } from '../financeSchemas';

const schema = z.object({ openingAmount: nonNegativeMoney('Ingresá con cuánto abrís la caja') });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cashBox: CashBox | null;
}

/** Abrir la caja (CU-226): el monto inicial; si no coincide con el saldo del libro se asienta un ajuste. */
export const OpenSessionModal = ({ open, onClose, cashBox }: Props) => {
  const openSession = useOpenCashSession();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, watch } = methods;
  const typed = watch('openingAmount');

  useEffect(() => {
    if (open) reset({ openingAmount: cashBox ? String(cashBox.balance) : '0' });
  }, [open, cashBox, reset]);

  const adjusts =
    cashBox !== null &&
    typed !== '' &&
    !Number.isNaN(parseMoney(typed ?? '')) &&
    parseMoney(typed ?? '') !== cashBox.balance;

  const onSubmit = (values: Values) => {
    if (!cashBox) return;
    openSession.mutate(
      { id: cashBox.cashBoxId, body: { openingAmount: parseMoney(values.openingAmount) } },
      {
        onSuccess: () => {
          notify.success('Caja abierta');
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
      closeBlocked={openSession.isPending}
      title={cashBox ? `Abrir ${cashBox.name}` : 'Abrir caja'}
      description="Contá el efectivo con el que arranca el turno."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="open-session-form" loading={openSession.isPending}>
            Abrir caja
          </Button>
        </>
      }
    >
      <Form methods={methods} id="open-session-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput
          name="openingAmount"
          label="Monto inicial"
          required
          inputMode="decimal"
          hint={cashBox ? `Saldo del libro: ${formatCurrency(cashBox.balance)}` : undefined}
        />
        {adjusts && cashBox && (
          <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
            El monto no coincide con el saldo del libro: se va a asentar un ajuste de apertura para que el saldo sea
            exactamente el que contaste.
          </p>
        )}
      </Form>
    </Modal>
  );
};
