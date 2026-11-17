import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
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
import { ApiError } from '../../../services/api/errors';
import { useDebounce } from '../../../hooks/useDebounce';
import type { PreviewCloseCashSessionBody } from '../../../services/api/types';
import { useCloseCashSession, useCloseCashSessionPreview, useCashSession } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { isMoneyText, nonNegativeMoney, optionalText, parseMoney } from '../financeSchemas';

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

  // Lo que se pide al back: el importe contado, si ya se puede leer. Uno ilegible no se consulta y no se inventa una
  // diferencia. La respuesta queda atada a su clave: una lenta de un valor viejo no reemplaza a la del valor actual.
  const previewKey = useMemo(
    () =>
      counted && isMoneyText(counted)
        ? JSON.stringify({ countedAmount: parseMoney(counted) } satisfies PreviewCloseCashSessionBody)
        : null,
    [counted],
  );
  const settledKey = useDebounce(previewKey, 400);
  const preview = useCloseCashSessionPreview(
    sessionId ?? '',
    settledKey ? (JSON.parse(settledKey) as PreviewCloseCashSessionBody) : null,
    open && Boolean(sessionId),
  );
  const current = previewKey !== null && previewKey === settledKey;
  const difference = current ? (preview.data?.difference ?? null) : null;
  const previewFailed = current && preview.isError;
  // Con la vista previa a la vista, las cifras de arriba son las del back para esa cuenta; sin ella, las de la sesión.
  const live = current ? preview.data : undefined;
  const previewError = previewFailed && preview.error instanceof ApiError ? preview.error : null;
  const previewMessage =
    previewError?.status === 409
      ? 'La sesión ya está cerrada.'
      : previewError?.status === 400
        ? (previewError.messages[0] ?? 'El importe no es válido.')
        : 'No se pudo calcular la diferencia ahora. Podés cerrar igual: el back la calcula al guardar.';

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
              { label: 'Monto inicial', value: formatCurrency(session.openingAmount) },
              { label: 'Entradas', value: formatCurrency(live?.totalIn ?? session.totalIn) },
              { label: 'Salidas', value: formatCurrency(live?.totalOut ?? session.totalOut) },
              {
                label: 'Saldo según el libro',
                value: formatCurrency(live?.expectedAmount ?? session.currentBalance),
              },
            ]}
          />
          <Form methods={methods} id="close-session-form" onSubmit={onSubmit} className="grid gap-4">
            <FormInput name="countedAmount" label="Monto contado" required inputMode="decimal" />
            {previewFailed && (
              <p role="status" className="text-sm text-warn">
                {previewMessage}
              </p>
            )}
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
