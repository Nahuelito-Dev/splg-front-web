import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCashBoxOptions } from '../../../services/queries/finance';
import { fromLocalInput, toLocalInput } from '../../../pages/FleetExpense/fleetExpenseDates';
import { formatCurrency } from '../../../utils/format';
import { CASH_BOX_KIND } from '../../../utils/statusLabels';
import { Button, Form, FormInput, FormSelect, Modal } from '../ui';
import { expensePaymentSchema, parseAmount, type ExpensePaymentValues } from './expensePaymentSchema';

export interface ExpensePaymentSubmit {
  cashBoxId: string;
  /** Instante ISO elegido. */
  at: string;
  amount?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Pide el importe, con su valor inicial y su tope. */
  amount?: { initial: number; max?: number | null; label?: string };
  /** Entrada de dinero (reintegro): cambia los textos de la caja y de la fecha. */
  income?: boolean;
  /** La fecha no puede ser anterior a este día (ISO). */
  notBefore?: string | null;
  notBeforeMessage?: string;
  submitLabel?: string;
  pending: boolean;
  onSubmit: (values: ExpensePaymentSubmit) => void;
}

const FORM_ID = 'expense-payment-form';

/**
 * Registrar el pago (o el cobro) de un gasto de la flota o de una compra: caja de efectivo, banco o billetera,
 * fecha del pago y, cuando aplica, el importe. Nada se guarda hasta «Guardar»; el back vuelve a validar todo y
 * sus errores (caja sin sesión, ya pagado…) se muestran tal cual quien llama los notifique.
 */
export const PayExpenseModal = ({
  open,
  onClose,
  title,
  description,
  amount,
  income = false,
  notBefore,
  notBeforeMessage,
  submitLabel = 'Guardar',
  pending,
  onSubmit,
}: Props) => {
  const cashBoxes = useCashBoxOptions({ enabled: open });
  const withAmount = amount !== undefined;
  const maxAmount = amount?.max;
  const schema = useMemo(
    () => expensePaymentSchema({ withAmount, maxAmount, notBefore, dateMessage: notBeforeMessage }),
    [withAmount, maxAmount, notBefore, notBeforeMessage],
  );
  const methods = useForm<ExpensePaymentValues>({
    resolver: zodResolver(schema),
    defaultValues: { cashBoxId: '', paidAt: toLocalInput(new Date()), amount: '' },
  });
  const { reset, watch } = methods;
  const initialAmount = amount?.initial;

  useEffect(() => {
    if (!open) return;
    reset({
      cashBoxId: '',
      paidAt: toLocalInput(new Date()),
      amount: initialAmount !== undefined ? String(initialAmount) : '',
    });
  }, [open, initialAmount, reset]);

  const boxes = cashBoxes.data?.data ?? [];
  const chosen = boxes.find((b) => b.cashBoxId === watch('cashBoxId'));
  const needsSession = chosen?.kind === 'cash' && chosen.requiresSession && !chosen.openSessionId;

  const submit = (values: ExpensePaymentValues) => {
    const parsed = schema.parse(values);
    onSubmit({
      cashBoxId: parsed.cashBoxId,
      at: fromLocalInput(parsed.paidAt) ?? new Date().toISOString(),
      ...(withAmount ? { amount: parseAmount(parsed.amount)?.toNumber() } : {}),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending} disabled={cashBoxes.isError || boxes.length === 0}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Form methods={methods} id={FORM_ID} onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            name="cashBoxId"
            label={income ? 'Caja en la que entra' : 'Caja de la que sale'}
            required
            options={[
              { value: '', label: 'Elegí una caja' },
              ...boxes.map((b) => ({
                value: b.cashBoxId,
                label: `${b.name} · ${CASH_BOX_KIND[b.kind].text} · ${formatCurrency(b.balance)}`,
              })),
            ]}
            hint="Efectivo, banco o billetera. Si es de efectivo, tiene que tener la sesión abierta."
          />
          <FormInput
            name="paidAt"
            label={income ? 'Fecha y hora en que se recibió' : 'Fecha y hora del pago'}
            type="datetime-local"
            required
          />
          {withAmount && (
            <FormInput name="amount" label={amount?.label ?? 'Importe'} type="number" step="0.01" min={0} required />
          )}
          {needsSession && (
            <p role="alert" className="text-xs font-medium text-warn sm:col-span-2">
              Esta caja de efectivo no tiene la sesión abierta: abrila en Finanzas o el movimiento se va a rechazar.
            </p>
          )}
        </Form>
        {cashBoxes.isError && (
          <p role="alert" className="text-sm text-danger">
            No pudimos cargar las cajas: cerrá y probá de nuevo.
          </p>
        )}
        {!cashBoxes.isError && !cashBoxes.isPending && boxes.length === 0 && (
          <p className="text-sm text-muted">La distribuidora no tiene cajas activas: creá una en Finanzas.</p>
        )}
      </div>
    </Modal>
  );
};
