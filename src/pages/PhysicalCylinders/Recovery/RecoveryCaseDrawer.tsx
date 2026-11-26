import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { Badge, Button, DetailList, RecordDrawer } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { RecoveryCaseDetail } from '../../../services/api/types';
import { useRecoveryCase } from '../../../services/queries/recovery';
import { formatCurrencyExact, formatDateTime, formatShortId } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';
import {
  DECISION_LABEL,
  NOTICE_KIND,
  OFFER_STATUS,
  RECOVERY_RISK_BAND,
  opportunisticText,
  riskText,
  RECOVERY_CASE_STATUS,
  isPendingDecision,
  recoveryStepText,
} from './recoveryLabels';
import { RecoveryResolveModal } from './RecoveryResolveModal';

interface Props {
  caseId: string | null;
  onClose: () => void;
}

const RESOLUTION_BY_STATUS: Partial<Record<RecoveryCaseDetail['status'], keyof typeof DECISION_LABEL>> = {
  deposit_charged: 'charge_deposit',
  written_off: 'write_off',
  closed_no_charge: 'close_no_charge',
};

const Banner = ({ tone, children }: { tone: 'danger' | 'warn' | 'success'; children: React.ReactNode }) => {
  const classes = {
    danger: 'border-danger/30 bg-danger-soft text-danger',
    warn: 'border-warn/30 bg-warn-soft text-warn',
    success: 'border-success/30 bg-success-soft text-success',
  }[tone];
  return (
    <p role="status" className={`rounded-xl border p-3 text-sm ${classes}`}>
      {children}
    </p>
  );
};

const Notices = ({ recoveryCase }: { recoveryCase: RecoveryCaseDetail }) =>
  recoveryCase.notices.length === 0 ? (
    <p className="text-sm text-muted">Todavía no se le mandó ningún aviso al cliente.</p>
  ) : (
    <ol className="space-y-2">
      {recoveryCase.notices.map((n) => (
        <li key={n.noticeId} className="rounded-xl border border-outline p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">
              {n.opportunistic ? opportunisticText(n.routeSheetNumber) : NOTICE_KIND[n.kind]}
            </span>
            {n.status && <Badge label={OFFER_STATUS[n.status]} />}
          </div>
          <p className="mt-1 text-xs text-muted">
            Enviado el {formatDateTime(n.sentAt)} · escalón {n.step} · vigente hasta el {formatDateTime(n.expiresAt)}
          </p>
          {n.orderId && (
            <p className="mt-1 text-sm text-ink-2">
              Pedido:{' '}
              <Link className="font-mono text-primary-strong hover:underline" to={`/orders/${n.orderId}`}>
                {formatShortId(n.orderId)}
              </Link>
              {n.respondedAt ? ` · respondió el ${formatDateTime(n.respondedAt)}` : ''}
            </p>
          )}
          {n.responseNote && <p className="mt-1 text-sm text-ink-2">{n.responseNote}</p>}
        </li>
      ))}
    </ol>
  );

const History = ({ recoveryCase }: { recoveryCase: RecoveryCaseDetail }) => (
  <ul className="space-y-1.5">
    {[...recoveryCase.history].reverse().map((m) => (
      <li key={m.movementId} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="text-ink">
          {m.fromState ? `${labelOf(CYLINDER_STATE, m.fromState).text} → ` : ''}
          {labelOf(CYLINDER_STATE, m.toState).text}
          {m.note ? <span className="block text-xs text-muted">{m.note}</span> : null}
        </span>
        <span className="text-xs text-muted">{formatDateTime(m.createdAt)}</span>
      </li>
    ))}
  </ul>
);

/**
 * El legajo de un caso de recupero (CU-108): el cliente, el envase, los avisos que se mandaron, el historial completo
 * del envase y el importe en juego. Si el caso espera una decisión, desde acá el administrador la toma.
 */
export const RecoveryCaseDrawer = ({ caseId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const detail = useRecoveryCase(caseId ?? undefined);
  const [deciding, setDeciding] = useState(false);
  const recoveryCase = detail.data;
  const pending = recoveryCase ? isPendingDecision(recoveryCase.status) : false;
  const decision = recoveryCase ? RESOLUTION_BY_STATUS[recoveryCase.status] : undefined;

  return (
    <>
      <RecordDrawer
        open={caseId !== null}
        onClose={onClose}
        size="lg"
        title={recoveryCase ? `Envase ${recoveryCase.cylinder.serial}` : 'Caso de recupero'}
        description={recoveryCase?.customer.fullName ?? undefined}
        badges={recoveryCase && <Badge label={RECOVERY_CASE_STATUS[recoveryCase.status]} />}
        loading={detail.isPending && caseId !== null}
        error={detail.error}
        onRetry={() => void detail.refetch()}
        resource="El caso"
        footer={
          recoveryCase && pending ? (
            <Button icon={<Gavel />} disabled={!canWrite} title={writeHint} onClick={() => setDeciding(true)}>
              Decidir el caso
            </Button>
          ) : undefined
        }
      >
        {recoveryCase && (
          <div className="space-y-6">
            {pending && (
              <Banner tone={recoveryCase.status === 'escalated' ? 'danger' : 'warn'}>
                {recoveryCase.status === 'escalated'
                  ? `Se agotaron los avisos y el depósito (${formatCurrencyExact(recoveryCase.depositAmount)}) supera el umbral: decidís vos. El sistema no cobra por su cuenta.`
                  : `Se agotaron los avisos. El importe (${formatCurrencyExact(recoveryCase.depositAmount)}) no supera el umbral: quedó como envase perdido en el reporte. Podés decidirlo igual.`}
              </Banner>
            )}
            {recoveryCase.status === 'returned' && (
              <Banner tone="success">El envase volvió y el depósito quedó liberado.</Banner>
            )}
            {recoveryCase.resolution && decision && (
              <Banner tone="success">
                {DECISION_LABEL[decision]}
                {recoveryCase.resolution.resolvedByName ? ` · ${recoveryCase.resolution.resolvedByName}` : ''}
                {recoveryCase.closedAt ? ` · ${formatDateTime(recoveryCase.closedAt)}` : ''}
                {recoveryCase.resolution.note ? `. ${recoveryCase.resolution.note}` : ''}
              </Banner>
            )}
            <DetailList
              items={[
                {
                  label: 'Envase',
                  value: (
                    <Link
                      className="text-primary-strong hover:underline"
                      to={`/physical-cylinders/${recoveryCase.cylinder.cylinderId}`}
                    >
                      {recoveryCase.cylinder.serial}
                    </Link>
                  ),
                  mono: true,
                },
                { label: 'Producto', value: recoveryCase.cylinder.product ?? 'Sin producto asignado' },
                { label: 'Estado del envase', value: labelOf(CYLINDER_STATE, recoveryCase.cylinder.state).text },
                { label: 'Depósito comprometido', value: formatCurrencyExact(recoveryCase.depositAmount) },
                { label: 'Cliente', value: recoveryCase.customer.fullName ?? 'Sin nombre' },
                {
                  label: 'Contacto',
                  value:
                    [recoveryCase.customer.email, recoveryCase.customer.phoneNumber].filter(Boolean).join(' · ') || '—',
                },
                { label: 'Entregado', value: formatDateTime(recoveryCase.deliveredAt) },
                { label: 'Días en su poder', value: String(recoveryCase.daysOut) },
                { label: 'Escalón', value: recoveryStepText(recoveryCase.step) },
                ...(recoveryCase.risk
                  ? [
                      {
                        label: 'Riesgo del cliente',
                        value: (
                          <span className="flex flex-wrap items-center gap-2">
                            <Badge label={RECOVERY_RISK_BAND[recoveryCase.risk.band]} />
                            <span className="text-sm text-ink-2">{riskText(recoveryCase.risk)}</span>
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  label: recoveryCase.status === 'open' ? 'Vence el escalón' : 'Caso abierto',
                  value: formatDateTime(
                    recoveryCase.status === 'open' ? recoveryCase.stepDueAt : recoveryCase.openedAt,
                  ),
                },
              ]}
            />
            <section aria-labelledby="recovery-notices">
              <h3 id="recovery-notices" className="mb-2 text-sm font-semibold text-ink">
                Avisos enviados
              </h3>
              <Notices recoveryCase={recoveryCase} />
            </section>
            <section aria-labelledby="recovery-history">
              <h3 id="recovery-history" className="mb-2 text-sm font-semibold text-ink">
                Historial del envase
              </h3>
              <History recoveryCase={recoveryCase} />
            </section>
          </div>
        )}
      </RecordDrawer>
      {deciding && recoveryCase && (
        <RecoveryResolveModal recoveryCase={recoveryCase} onClose={() => setDeciding(false)} />
      )}
    </>
  );
};
