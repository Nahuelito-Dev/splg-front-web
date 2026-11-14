import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, Form, FormCheckbox, FormSelect, FormTextArea } from '../../../common/components/ui';
import { SUPPORT_MINUTES, SUPPORT_NOTE_MAX, type SupportScope } from '../../../services/api/supportSessions';
import type { SupportSession } from '../../../services/api/types';
import { approvalSchema, rejectSchema, type ApprovalValues, type RejectValues } from './approvalSchema';
import { useApproveSupportAccess, useRejectSupportAccess } from '../../../services/queries/supportSessions';
import { formatDateTime } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { labelOf, SUPPORT_SCOPE } from '../../../utils/statusLabels';

const SCOPES: SupportScope[] = ['personal_data', 'files', 'exports'];

interface Props {
  session: SupportSession;
  canManage: boolean;
  platformName?: string;
  onOpen: (session: SupportSession) => void;
}

/**
 * Un pedido pendiente: quién, por qué, cuánto y qué pide. Aprobar y rechazar se confirman en la misma tarjeta (se
 * despliega lo que se va a aprobar, con la duración y el alcance que se pueden achicar).
 */
export const PendingRequestCard = ({ session, canManage, platformName, onOpen }: Props) => {
  const [step, setStep] = useState<'idle' | 'approve' | 'reject'>('idle');
  const approve = useApproveSupportAccess();
  const reject = useRejectSupportAccess();
  const requestedScope = SCOPES.filter((s) => session.scope.includes(s));
  const approveForm = useForm<ApprovalValues>({
    resolver: zodResolver(approvalSchema(session)),
    defaultValues: {
      minutes: session.requestedMinutes,
      personal_data: session.scope.includes('personal_data'),
      files: session.scope.includes('files'),
      exports: session.scope.includes('exports'),
      note: '',
    },
  });
  const rejectForm = useForm<RejectValues>({ resolver: zodResolver(rejectSchema), defaultValues: { note: '' } });

  const onApprove = (values: ApprovalValues) =>
    approve.mutate(
      {
        id: session.id,
        body: {
          minutes: values.minutes as (typeof SUPPORT_MINUTES)[number],
          scope: requestedScope.filter((s) => values[s]),
          note: values.note.trim() || undefined,
        },
      },
      {
        onSuccess: () => notify.success(`Acceso aprobado por ${values.minutes} minutos`),
        onError: notify.error,
      },
    );

  const onReject = (values: RejectValues) =>
    reject.mutate(
      { id: session.id, body: { note: values.note.trim() || undefined } },
      { onSuccess: () => notify.success('Pedido rechazado'), onError: notify.error },
    );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {session.requestedBy.fullName ?? 'Soporte'}
            {platformName ? <span className="font-normal text-muted"> · soporte de {platformName}</span> : null}
          </p>
          <p className="text-xs text-muted">
            Pedido el {formatDateTime(session.createdAt)}
            {session.requestExpiresAt ? ` · caduca el ${formatDateTime(session.requestExpiresAt)}` : ''}
          </p>
        </div>
        <Badge label={{ text: `${session.requestedMinutes} min`, tone: 'neutral' }} />
      </div>
      <p className="mt-3 whitespace-pre-line break-words text-sm text-ink">{session.reason}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {session.ticketRef && <span className="font-mono">{session.ticketRef} ·</span>}
        {requestedScope.length === 0 ? (
          <span>Sólo lo básico (datos personales ocultos)</span>
        ) : (
          requestedScope.map((s) => <Badge key={s} label={labelOf(SUPPORT_SCOPE, s)} />)
        )}
      </div>

      {step === 'idle' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setStep('approve')}
            blockedReason={canManage ? undefined : 'Necesitás el permiso para gestionar los accesos de soporte'}
          >
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setStep('reject')}
            blockedReason={canManage ? undefined : 'Necesitás el permiso para gestionar los accesos de soporte'}
          >
            Rechazar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpen(session)}>
            Ver detalle
          </Button>
        </div>
      )}

      {step === 'approve' && (
        <Form
          methods={approveForm}
          onSubmit={onApprove}
          className="mt-4 grid gap-3 rounded-lg border border-outline bg-surface-hover p-3"
        >
          <p className="text-sm font-medium text-ink">
            ¿Aprobar? El reloj arranca ahora. Podés acortar la duración y sacar alcance, no ampliarlos.
          </p>
          <FormSelect
            name="minutes"
            label="Duración"
            required
            registerOptions={{ valueAsNumber: true }}
            options={SUPPORT_MINUTES.filter((m) => m <= session.requestedMinutes).map((m) => ({
              value: String(m),
              label: `${m} minutos`,
            }))}
          />
          {requestedScope.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium text-ink">Alcance aprobado</legend>
              {requestedScope.map((s) => (
                <FormCheckbox key={s} name={s} label={labelOf(SUPPORT_SCOPE, s).text} />
              ))}
            </fieldset>
          )}
          <FormTextArea name="note" label="Nota (opcional)" rows={2} maxLength={SUPPORT_NOTE_MAX} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={approve.isPending}>
              Confirmar aprobación
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setStep('idle')} disabled={approve.isPending}>
              Cancelar
            </Button>
          </div>
        </Form>
      )}

      {step === 'reject' && (
        <Form
          methods={rejectForm}
          onSubmit={onReject}
          className="mt-4 grid gap-3 rounded-lg border border-outline bg-surface-hover p-3"
        >
          <p className="text-sm font-medium text-ink">¿Rechazar el pedido? El soporte no va a poder entrar.</p>
          <FormTextArea name="note" label="Motivo (opcional)" rows={2} maxLength={SUPPORT_NOTE_MAX} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="danger" loading={reject.isPending}>
              Confirmar rechazo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setStep('idle')} disabled={reject.isPending}>
              Cancelar
            </Button>
          </div>
        </Form>
      )}
    </Card>
  );
};
