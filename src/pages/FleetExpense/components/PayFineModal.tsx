import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, DropZone, Form, FormInput, FormSelect, Modal } from '../../../common/components/ui';
import type { TrafficFineV2 } from '../../../services/api/types';
import { useCashBoxOptions } from '../../../services/queries/finance';
import { usePayTrafficFine, useUploadFineReceipt } from '../../../services/queries/fleetExpense';
import { CASH_BOX_KIND } from '../../../utils/statusLabels';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { fileError, RECEIPT_TYPES, SCAN_TEXT, type ScanState } from '../../Insurance/receiptUpload';
import { prefillFromScan } from '../../Insurance/scanPrefill';
import { fromLocalInput, toLocalInput } from '../fleetExpenseDates';
import { expectedFineAmount } from '../finePayment';
import { payFineSchema, type PayFineFormValues } from '../fleetExpenseSchemas';
import { FinePayLink, FinePaymentCode } from './FinePayLink';

interface Props {
  fine: TrafficFineV2 | null;
  onClose: () => void;
}

const defaults = (fine: TrafficFineV2 | null): PayFineFormValues => ({
  paidAt: toLocalInput(new Date()),
  amount: fine ? expectedFineAmount(fine) : '',
  operationNumber: '',
  cashBoxId: '',
});

/**
 * Registrar el pago de una multa (CU-199). «Pagar» abre el enlace de pago; ya pagada afuera, al elegir el
 * comprobante se sube y se escanea solo, y el formulario queda precargado para revisarlo: nada se guarda hasta
 * apretar «Guardar», que además saca el egreso de la caja elegida.
 */
export const PayFineModal = ({ fine, onClose }: Props) => {
  const upload = useUploadFineReceipt();
  const pay = usePayTrafficFine();
  const cashBoxes = useCashBoxOptions({ enabled: fine !== null });
  const occurredAt = fine?.occurredAt;
  const maxAmount = fine?.amount ?? 0;
  const schema = useMemo(() => payFineSchema(maxAmount, occurredAt), [maxAmount, occurredAt]);
  const methods = useForm<PayFineFormValues>({ resolver: zodResolver(schema), defaultValues: defaults(null) });
  const { reset, getValues, watch } = methods;
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>('idle');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanWarning, setScanWarning] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!fine) return;
    reset(defaults(fine));
    setAttachmentId(null);
    setScan('idle');
    setWarnings([]);
    setScanWarning('');
    setFileName('');
  }, [fine, reset]);

  const handleFile = (file: File) => {
    if (!fine) return;
    const invalid = fileError(file);
    if (invalid) {
      notify.error(new Error(invalid));
      return;
    }
    // Un comprobante nuevo reemplaza al anterior: hasta que suba bien no hay nada que guardar.
    setAttachmentId(null);
    setFileName('');
    setScan('scanning');
    setWarnings([]);
    setScanWarning('');
    upload.mutate(
      { id: fine.fineId, file },
      {
        onSuccess: (result) => {
          setAttachmentId(result.attachmentId);
          setFileName(file.name);
          const data = result.scan.available ? result.scan.data : null;
          // Lo que no se leyó vuelve al valor inicial: nunca quedan datos de un comprobante anterior.
          const initial = defaults(fine);
          const cashBoxId = getValues('cashBoxId');
          if (!data) {
            reset({ ...initial, cashBoxId });
            setScanWarning(result.scan.warning ?? '');
            setScan('unavailable');
            return;
          }
          const prefill = prefillFromScan(data, {
            paidAt: String(initial.paidAt),
            amount: initial.amount as string | number,
            operationNumber: '',
          });
          reset({ ...initial, ...prefill, cashBoxId });
          setWarnings(data.warnings);
          setScanWarning(result.scan.warning ?? '');
          setScan('done');
        },
        onError: (error) => {
          setScan('idle');
          notify.error(error);
        },
      },
    );
  };

  const onSubmit = (values: PayFineFormValues) => {
    if (!fine || !attachmentId) return;
    const parsed = schema.parse(values);
    pay.mutate(
      {
        id: fine.fineId,
        body: {
          attachmentId,
          paidAt: fromLocalInput(parsed.paidAt) ?? new Date().toISOString(),
          amount: parsed.amount,
          ...(parsed.operationNumber ? { operationNumber: parsed.operationNumber } : {}),
          cashBoxId: parsed.cashBoxId,
        },
      },
      {
        onSuccess: () => {
          notify.success('Pago registrado: la multa quedó paga');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  const boxes = cashBoxes.data?.data ?? [];
  const chosenBox = boxes.find((b) => b.cashBoxId === watch('cashBoxId'));
  const needsSession = chosenBox?.kind === 'cash' && chosenBox.requiresSession && !chosenBox.openSessionId;
  const scanning = scan === 'scanning';
  const busy = pay.isPending || scanning;
  const blockedReason = scanning
    ? 'Esperá a que termine el escaneo'
    : !attachmentId
      ? 'Subí el comprobante para poder guardar'
      : undefined;

  return (
    <Modal
      open={fine !== null}
      onClose={onClose}
      closeBlocked={busy}
      size="md"
      title="Registrar pago"
      description={fine ? `Acta ${fine.actNumber} · ${formatCurrency(fine.amount)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="pay-fine-form" loading={pay.isPending} blockedReason={blockedReason}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fine && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <FinePayLink fine={fine} />
            <FinePaymentCode fine={fine} />
            {fine.voluntaryPaymentAmount != null && expectedFineAmount(fine) === fine.voluntaryPaymentAmount && (
              <span className="text-xs text-ink-2">
                Con pago voluntario: {formatCurrency(fine.voluntaryPaymentAmount)}
              </span>
            )}
          </div>
        )}
        <div className="space-y-2">
          <DropZone
            inputLabel="Elegir el comprobante de pago"
            accept={RECEIPT_TYPES}
            onFile={handleFile}
            onReject={(message) => notify.error(new Error(message))}
            loading={scanning}
            title={attachmentId ? 'Cambiar el comprobante' : 'Soltá el comprobante acá o elegilo'}
            hint="PDF, JPG, PNG o WEBP, hasta 10 MB. Se lee solo al subirlo."
          />
          <div role="status" className="space-y-1">
            {scan !== 'idle' && (
              <p className={scan === 'unavailable' ? 'text-sm text-warn' : 'text-sm text-ink-2'}>
                {scan === 'unavailable' && scanWarning ? scanWarning : SCAN_TEXT[scan]}
                {fileName && scan !== 'scanning' ? ` · ${fileName}` : ''}
              </p>
            )}
            {scan === 'done' && scanWarning && <p className="text-xs text-warn">{scanWarning}</p>}
            {warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-warn">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Form methods={methods} id="pay-fine-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormInput name="paidAt" label="Fecha y hora del pago" type="datetime-local" required />
          <FormInput name="amount" label="Importe pagado" type="number" step="0.01" min={0} required />
          <FormInput name="operationNumber" label="Número de operación" maxLength={60} />
          <FormSelect
            name="cashBoxId"
            label="Caja de la que salió"
            required
            options={[
              { value: '', label: 'Elegí una caja' },
              ...boxes.map((b) => ({
                value: b.cashBoxId,
                label: `${b.name} · ${CASH_BOX_KIND[b.kind].text} · ${formatCurrency(b.balance)}`,
              })),
            ]}
            hint="Si es de efectivo, tiene que tener la sesión abierta."
          />
          {needsSession && (
            <p role="alert" className="text-xs font-medium text-warn sm:col-span-2">
              Esta caja de efectivo no tiene la sesión abierta: abrila en Finanzas o el pago se va a rechazar.
            </p>
          )}
        </Form>
        {cashBoxes.isError && (
          <p role="alert" className="text-sm text-danger">
            No pudimos cargar las cajas: cerrá y probá de nuevo.
          </p>
        )}
      </div>
    </Modal>
  );
};
