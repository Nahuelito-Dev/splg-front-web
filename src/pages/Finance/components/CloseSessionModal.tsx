import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  DetailList,
  ErrorState,
  LoadingState,
  Modal,
  FormInput,
  FormTextArea,
  Form,
} from '../../../common/components/ui';
import { useCloseCashSession, useCashSession } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { nonNegativeMoney, optionalText, parseMoney } from '../financeSchemas';

const schema = z.object({
  countedAmount: nonNegativeMoney('Ingresá lo que contaste'),
  notes: optionalText(500),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
}

/** Cerrar la caja con arqueo (CU-227): se ve lo esperado, se cuenta y se asienta la diferencia. */
export const CloseSessionModal = ({ open, onClose, sessionId }: Props) => {
  const { data: session, isPending, error, refetch } = useCashSession(sessionId ?? undefined, { enabled: open });
  const close = useCloseCashSession();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, watch } = methods;
  const counted = watch('countedAmount');

  useEffect(() => {
    if (open) reset({ countedAmount: '', notes: '' });
  }, [open, reset]);

  const expected = session ? session.currentBalance : null;
  const parsed = counted && !Number.isNaN(parseMoney(counted)) ? parseMoney(counted) : null;
  const difference = expected !== null && parsed !== null ? Math.round((parsed - expected) * 100) / 100 : null;

  const onSubmit = (values: Values) => {
    if (!sessionId) return;
    close.mutate(
      {
        id: sessionId,
        body: { countedAmount: parseMoney(values.countedAmount), notes: values.notes || undefined },
      },
      {
        onSuccess: () => {
          notify.success('Caja cerrada');
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
      closeBlocked={close.isPending}
      size="md"
      title="Cerrar la caja con arqueo"
      description="Contá la plata y cargá el total: si no coincide con el libro, la diferencia queda asentada."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="close-session-form" loading={close.isPending} disabled={!session}>
            Cerrar caja
          </Button>
        </>
      }
    >
      {isPending ? (
        <LoadingState label="Cargando la sesión…" />
      ) : error || !session ? (
        <ErrorState error={error} resource="La sesión" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-5">
          <DetailList
            items={[
              { label: 'Monto inicial', value: formatCurrency(session.openingAmount), mono: true },
              { label: 'Entradas', value: formatCurrency(session.totalIn), mono: true },
              { label: 'Salidas', value: formatCurrency(session.totalOut), mono: true },
              { label: 'Saldo según el libro', value: formatCurrency(session.currentBalance), mono: true },
            ]}
          />
          <Form methods={methods} id="close-session-form" onSubmit={onSubmit} className="grid gap-4">
            <FormInput name="countedAmount" label="Monto contado" required inputMode="decimal" />
            {difference !== null && (
              <p
                role="status"
                className={`rounded-lg border px-3 py-2 text-sm ${
                  difference === 0
                    ? 'border-success bg-success-soft text-success'
                    : 'border-warn bg-warn-soft text-warn'
                }`}
              >
                {difference === 0
                  ? 'Coincide con el libro.'
                  : difference < 0
                    ? `Faltan ${formatCurrency(-difference)}: se asienta como faltante de caja.`
                    : `Sobran ${formatCurrency(difference)}: se asienta como sobrante de caja.`}
              </p>
            )}
            <FormTextArea name="notes" label="Notas (opcional)" maxLength={500} />
          </Form>
        </div>
      )}
    </Modal>
  );
};
