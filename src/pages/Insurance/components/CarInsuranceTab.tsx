import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, FileText, PencilLine, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermiso } from '../../../hooks';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, ReasonModal } from '../../../common/components/ui';
import type { InsuranceInstallment, InsurancePolicy } from '../../../services/api/types';
import { useAttachmentFile } from '../../../services/queries/attachments';
import {
  useApproveInsuranceInstallment,
  useCancelInsurancePolicy,
  useCarInsurance,
} from '../../../services/queries/insurance';
import { openFileSource } from '../../../utils/fileSource';
import { argentinaDay, formatCurrency, formatDay, formatDateTime, formatShortId } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { INSURANCE_POLICY_STATUS } from '../../../utils/statusLabels';
import { needsApproval, installmentLabel } from '../insuranceState';
import { InstallmentPaymentModal } from './InstallmentPaymentModal';
import { InsurancePolicyFormModal } from './InsurancePolicyFormModal';

interface Props {
  carId: string;
  canWrite: boolean;
  writeHint?: string;
}

const copyPaymentCode = (code: string) => {
  navigator.clipboard.writeText(code).then(
    () => notify.success('Código de pago copiado'),
    () => notify.error(new Error('No se pudo copiar el código')),
  );
};

const linkClass =
  'inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-primary-edge bg-gradient-to-b from-primary-from to-primary-to px-3 text-xs font-semibold text-on-primary shadow-primary transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:h-4 [&_svg]:w-4';

interface InstallmentRowProps {
  installment: InsuranceInstallment;
  policy: InsurancePolicy;
  today: string;
  canWrite: boolean;
  writeHint?: string;
  onRegister?: (installment: InsuranceInstallment) => void;
  onApprove?: (installment: InsuranceInstallment) => void;
  approving?: boolean;
}

const InstallmentRow = ({
  installment,
  policy,
  today,
  canWrite,
  writeHint,
  onRegister,
  onApprove,
  approving = false,
}: InstallmentRowProps) => {
  const fileSource = useAttachmentFile();
  const label = installmentLabel(installment, today);
  const payUrl = policy.insurer.paymentUrl;
  const openReceipt = () => {
    if (!installment.receiptAttachmentId) return;
    fileSource.mutate(
      { attachmentId: installment.receiptAttachmentId, disposition: 'inline' },
      { onSuccess: openFileSource, onError: notify.error },
    );
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-sm">
      <div className="min-w-[8rem]">
        <p className="font-medium text-ink">Cuota {installment.label}</p>
        <p className="text-xs text-muted">
          Vence {formatDay(installment.dueDate)} · gracia hasta {formatDay(installment.graceUntil)}
        </p>
      </div>
      <span className="tabular-nums text-ink-2">{formatCurrency(installment.amount)}</span>
      <Badge label={label} />
      {installment.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          {payUrl ? (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pagar (se abre en otra pestaña)"
              className={linkClass}
            >
              <ExternalLink aria-hidden="true" /> Pagar
            </a>
          ) : (
            <Button size="sm" icon={<ExternalLink />} blockedReason="La aseguradora no tiene enlace de pago cargado">
              Pagar
            </Button>
          )}
          {onApprove && needsApproval(installment) && (
            <Button
              size="sm"
              icon={<CheckCircle2 />}
              loading={approving}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => onApprove(installment)}
            >
              Aprobar pago
            </Button>
          )}
          {onRegister && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canWrite}
              title={writeHint}
              blockedReason={needsApproval(installment) ? 'Aprobá el pago de la cuota antes de registrarlo' : undefined}
              onClick={() => onRegister(installment)}
            >
              Registrar pago
            </Button>
          )}
        </div>
      )}
      {installment.status === 'pending' && installment.approvalStatus === 'approved' && installment.approvedAt && (
        <p className="basis-full text-xs text-ink-2">Pago aprobado el {formatDateTime(installment.approvedAt)}</p>
      )}
      {installment.status === 'paid' && (
        <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
          <span>
            Pagada {installment.paidAt ? formatDateTime(installment.paidAt) : ''}
            {installment.paidAmount != null ? ` · ${formatCurrency(installment.paidAmount)}` : ''}
            {installment.operationNumber ? ` · op. ${installment.operationNumber}` : ''}
          </span>
          {installment.receiptAttachmentId && (
            <Button size="sm" variant="ghost" icon={<FileText />} loading={fileSource.isPending} onClick={openReceipt}>
              Ver comprobante
            </Button>
          )}
          {installment.cashMovementId && (
            <Link className="font-medium text-primary hover:underline" to="/finance/movements">
              Movimiento de caja {formatShortId(installment.cashMovementId)}
            </Link>
          )}
        </div>
      )}
    </li>
  );
};

/** Pestaña «Seguro» de la ficha del vehículo: la póliza vigente, sus cuotas con el pago y el historial. */
export const CarInsuranceTab = ({ carId, canWrite, writeHint }: Props) => {
  const { data, isPending, error, refetch } = useCarInsurance(carId);
  const cancel = useCancelInsurancePolicy();
  const approve = useApproveInsuranceInstallment();
  const gestionar = usePermiso('flota.gestionar');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [cancelling, setCancelling] = useState<InsurancePolicy | null>(null);
  const [paying, setPaying] = useState<InsuranceInstallment | null>(null);
  const today = argentinaDay(new Date());

  if (isPending) return <LoadingState />;
  if (error || !data) return <ErrorState error={error} resource="El seguro" onRetry={() => void refetch()} />;

  const { current, history } = data;
  const openForm = (policy: InsurancePolicy | null) => {
    setEditing(policy);
    setFormOpen(true);
  };

  const confirmCancel = (reason: string) => {
    if (!cancelling) return;
    cancel.mutate(
      { id: cancelling.policyId, body: { reason } },
      {
        onSuccess: (result) => {
          notify.success('Póliza cancelada');
          if (!result.fleetRevert.reverted) notify.warn(result.fleetRevert.notes.join(' '));
          setCancelling(null);
        },
        onError: notify.error,
      },
    );
  };

  const confirmApprove = async (installment: InsuranceInstallment) => {
    const ok = await confirm({
      title: '¿Aprobar el pago de la cuota?',
      text: `Cuota ${installment.label} de ${formatCurrency(installment.amount)}. Aprobar no mueve plata: después registrás el pago con su comprobante y la caja. Queda asentado quién aprobó y cuándo.`,
      confirmText: 'Aprobar pago',
    });
    if (!ok) return;
    approve.mutate(installment.installmentId, {
      onSuccess: () => notify.success(`Pago de la cuota ${installment.label} aprobado`),
      onError: notify.error,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        {current ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-ink">{current.insurer.name}</h3>
                  <Badge label={INSURANCE_POLICY_STATUS[current.status]} />
                </div>
                <p className="text-sm text-ink-2">
                  Póliza <span className="font-mono">{current.policyNumber}</span> · {current.coverage}
                </p>
                <p className="text-xs text-muted">
                  Vigencia: {formatDay(current.validFrom)} al {formatDay(current.validTo)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<PencilLine />}
                  disabled={!canWrite}
                  title={writeHint}
                  onClick={() => openForm(current)}
                >
                  Editar póliza
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<XCircle />}
                  disabled={!canWrite}
                  title={writeHint}
                  onClick={() => setCancelling(current)}
                >
                  Cancelar póliza
                </Button>
                <Button size="sm" icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => openForm(null)}>
                  Cargar póliza
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {current.paymentCode && (
                <span className="flex items-center gap-2">
                  <span className="text-muted">Código de pago</span>
                  <span className="break-all font-mono text-ink">{current.paymentCode}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Copy />}
                    aria-label="Copiar el código de pago"
                    onClick={() => copyPaymentCode(current.paymentCode ?? '')}
                  >
                    Copiar
                  </Button>
                </span>
              )}
              {current.insurer.paymentUrl && (
                <a
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  href={current.insurer.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> Enlace de pago de la aseguradora
                </a>
              )}
            </div>
            {current.installments.length === 0 ? (
              <p className="text-sm text-muted">La póliza no tiene cuotas.</p>
            ) : (
              <ul aria-label="Cuotas del seguro" className="divide-y divide-outline">
                {current.installments.map((installment) => (
                  <InstallmentRow
                    key={installment.installmentId}
                    installment={installment}
                    policy={current}
                    today={today}
                    canWrite={canWrite}
                    writeHint={writeHint}
                    onRegister={setPaying}
                    onApprove={gestionar.known && !gestionar.allowed ? undefined : (i) => void confirmApprove(i)}
                    approving={approve.isPending && approve.variables === installment.installmentId}
                  />
                ))}
              </ul>
            )}
          </>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Sin póliza vigente"
            description="Este vehículo no tiene un seguro cargado. Cargalo con su plan de cuotas para recibir los avisos de vencimiento."
            action={
              <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => openForm(null)}>
                Cargar póliza
              </Button>
            }
          />
        )}
      </Card>

      {history.length > 0 && (
        <Card className="p-6">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Pólizas anteriores ({history.length})
            </summary>
            <ul className="mt-3 divide-y divide-outline">
              {history.map((policy) => {
                const paid = policy.installments.filter((i) => i.status === 'paid').length;
                return (
                  <li
                    key={policy.policyId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="font-medium text-ink">
                      {policy.insurer.name} · <span className="font-mono">{policy.policyNumber}</span>
                    </span>
                    <span className="text-ink-2">
                      {formatDay(policy.validFrom)} al {formatDay(policy.validTo)} · {paid}/{policy.installments.length}{' '}
                      cuotas pagas
                    </span>
                    <Badge label={INSURANCE_POLICY_STATUS[policy.status]} />
                  </li>
                );
              })}
            </ul>
          </details>
        </Card>
      )}

      <InsurancePolicyFormModal open={formOpen} onClose={() => setFormOpen(false)} carId={carId} policy={editing} />
      <InstallmentPaymentModal
        installment={paying}
        context={current ? `${current.insurer.name} · póliza ${current.policyNumber}` : undefined}
        onClose={() => setPaying(null)}
      />
      <ReasonModal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        title="¿Cancelar la póliza?"
        description="Baja lógica: la póliza no se borra. Las cuotas pendientes se cancelan y las ya pagas quedan registradas."
        confirmLabel="Cancelar póliza"
        placeholder="Por qué se cancela (obligatorio)"
        loading={cancel.isPending}
      />
    </div>
  );
};
