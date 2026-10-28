import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, DropZone, Form, FormInput, FormSelect, Modal } from '../../../common/components/ui';
import type { InsuranceInstallment } from '../../../services/api/types';
import { useCashBoxOptions } from '../../../services/queries/finance';
import { usePayInsuranceInstallment, useUploadInstallmentReceipt } from '../../../services/queries/insurance';
import { CASH_BOX_KIND } from '../../../utils/statusLabels';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { fromLocalInput, toLocalInput } from '../../FleetExpense/fleetExpenseDates';
import { paymentSchema, type PaymentFormValues } from '../insuranceSchemas';
import { prefillFromScan } from '../scanPrefill';

interface Props {
  installment: InsuranceInstallment | null;
  /** Para el encabezado: aseguradora y póliza de la cuota. */
  context?: string;
  onClose: () => void;
}

type ScanState = 'idle' | 'scanning' | 'done' | 'unavailable';

const RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

const SCAN_TEXT: Record<ScanState, string> = {
  idle: '',
  scanning: 'Escaneando…',
  done: 'Escaneo listo: revisá los datos',
  unavailable: 'Escaneo no disponible: cargá los datos',
};

const fileError = (file: File): string | null => {
  if (!RECEIPT_TYPES.includes(file.type)) return 'Sólo se aceptan comprobantes PDF, JPG, PNG o WEBP.';
  if (file.size > MAX_BYTES) return 'El archivo no puede superar los 10 MB.';
  return null;
};

const defaults = (installment: InsuranceInstallment | null): PaymentFormValues => ({
  paidAt: toLocalInput(new Date()),
  amount: installment?.amount ?? '',
  operationNumber: '',
  cashBoxId: '',
});

/**
 * Registrar el pago de una cuota. Al elegir el comprobante se sube y se escanea solo; el formulario queda
 * precargado para revisarlo y nada se guarda hasta apretar «Guardar».
 */
export const InstallmentPaymentModal = ({ installment, context, onClose }: Props) => {
  const upload = useUploadInstallmentReceipt();
  const pay = usePayInsuranceInstallment();
  const cashBoxes = useCashBoxOptions({ enabled: installment !== null });
  const methods = useForm<PaymentFormValues>({ resolver: zodResolver(paymentSchema), defaultValues: defaults(null) });
  const { reset, getValues, watch } = methods;
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState>('idle');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scanWarning, setScanWarning] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!installment) return;
    reset(defaults(installment));
    setAttachmentId(null);
    setScan('idle');
    setWarnings([]);
    setScanWarning('');
    setFileName('');
  }, [installment, reset]);

  const handleFile = (file: File) => {
    if (!installment) return;
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
      { id: installment.installmentId, file },
      {
        onSuccess: (result) => {
          setAttachmentId(result.attachmentId);
          setFileName(file.name);
          const data = result.scan.available ? result.scan.data : null;
          // Lo que no se leyó vuelve al valor inicial: nunca quedan datos de un comprobante anterior.
          const initial = defaults(installment);
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

  const onSubmit = (values: PaymentFormValues) => {
    if (!installment || !attachmentId) return;
    const parsed = paymentSchema.parse(values);
    pay.mutate(
      {
        id: installment.installmentId,
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
          notify.success('Pago registrado: la cuota quedó paga');
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
      open={installment !== null}
      onClose={onClose}
      closeBlocked={busy}
      size="md"
      title="Registrar pago"
      description={
        installment
          ? `Cuota ${installment.label} · ${formatCurrency(installment.amount)}${context ? ` · ${context}` : ''}`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="insurance-payment-form" loading={pay.isPending} blockedReason={blockedReason}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
        <Form methods={methods} id="insurance-payment-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
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
