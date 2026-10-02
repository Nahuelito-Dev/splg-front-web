import { useEffect, useState } from 'react';
import { usePermissions } from '../../../hooks';
import { Badge, Button, DetailList, Modal, TextArea } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { useReopenClaim, useResolveClaim, useTakeClaim } from '../../../services/queries/claims';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';
import { ClaimHistory } from './ClaimHistory';

interface Props {
  open: boolean;
  onClose: () => void;
  claim: Claim | null;
}

type PendingAction = 'resolve' | 'reject' | 'reopen' | null;

/**
 * Ficha de un reclamo (CU-025): historial de la auditoría y las cuatro
 * acciones de la máquina de estados — Tomar, Resolver, Rechazar, Reabrir.
 * Cada una pide confirmación; resolver/rechazar/reabrir, además, un motivo.
 */
export const ClaimDetailModal = ({ open, onClose, claim }: Props) => {
  const [action, setAction] = useState<PendingAction>(null);
  const [note, setNote] = useState('');
  const { canOperate, operateHint } = usePermissions();
  const takeClaim = useTakeClaim();
  const resolveClaim = useResolveClaim();
  const reopenClaim = useReopenClaim();

  useEffect(() => {
    if (open) {
      setAction(null);
      setNote('');
    }
  }, [open, claim]);

  if (!claim) return null;

  const canTake = claim.status === 'pending';
  const canResolveOrReject = claim.status === 'pending' || claim.status === 'in_process';
  const canReopen = claim.status === 'resolved' || claim.status === 'rejected';

  const handleTake = async () => {
    const confirmed = await confirm({ title: '¿Tomar este reclamo?', text: 'Pasa a "En proceso": queda a tu cargo.' });
    if (!confirmed) return;
    takeClaim.mutate(claim.claim_id, { onSuccess: () => notify.success('Reclamo tomado'), onError: notify.error });
  };

  const confirmActionLabel = action === 'resolve' ? 'Resolver' : action === 'reject' ? 'Rechazar' : 'Reabrir';
  const noteLabel = action === 'reopen' ? 'Motivo de la reapertura' : 'Nota de resolución';

  const handleConfirmAction = () => {
    if (!action) return;
    const trimmed = note.trim();
    if (!trimmed) {
      notify.error(new Error(action === 'reopen' ? 'Ingresá el motivo de la reapertura' : 'Ingresá una nota'));
      return;
    }
    if (action === 'reopen') {
      reopenClaim.mutate(
        { id: claim.claim_id, body: { reason: trimmed } },
        {
          onSuccess: () => {
            notify.success('Reclamo reabierto');
            setAction(null);
            setNote('');
          },
          onError: notify.error,
        },
      );
      return;
    }
    resolveClaim.mutate(
      { id: claim.claim_id, body: { resolution: trimmed, status: action === 'resolve' ? 'resolved' : 'rejected' } },
      {
        onSuccess: () => {
          notify.success(action === 'resolve' ? 'Reclamo resuelto' : 'Reclamo rechazado');
          setAction(null);
          setNote('');
        },
        onError: notify.error,
      },
    );
  };

  const acting = takeClaim.isPending || resolveClaim.isPending || reopenClaim.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar reclamo"
      description={`${formatShortId(claim.claim_id)} · Pedido ${formatShortId(claim.order_id)}`}
      size="md"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-outline bg-surface-hover p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Cliente</h3>
            <p className="font-medium text-ink">{claim.customer?.full_name ?? '—'}</p>
            <p className="text-sm text-muted">{claim.customer?.phone_number ?? '—'}</p>
            <p className="text-xs text-muted">{claim.customer?.email ?? ''}</p>
          </div>
          <div className="rounded-xl border border-outline bg-surface-hover p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Motivo</h3>
            <p className="font-medium text-ink">{claim.reason}</p>
            <p className="text-sm italic text-muted">“{claim.description}”</p>
          </div>
        </div>

        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(CLAIM_STATUS, claim.status)} /> },
            { label: 'Alta', value: formatDateTime(claim.createdAt) },
            { label: 'Nota de resolución', value: claim.resolutionNote || '—', wide: true },
          ]}
        />

        {claim.photoUrl ? (
          <img
            src={claim.photoUrl}
            alt="Evidencia del reclamo"
            className="h-56 w-full rounded-xl border border-outline object-cover"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">
            Sin foto adjunta
          </p>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Historial</h3>
          <ClaimHistory claimId={claim.claim_id} />
        </div>

        <div className="space-y-3 border-t border-outline pt-4">
          {action ? (
            <>
              <TextArea label={noteLabel} required rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAction(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant={action === 'reject' ? 'danger' : 'primary'}
                  loading={acting}
                  onClick={handleConfirmAction}
                >
                  {confirmActionLabel}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {operateHint && <p className="mr-auto text-sm text-muted">{operateHint}</p>}
              {canTake && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canOperate}
                  title={operateHint}
                  loading={takeClaim.isPending}
                  onClick={() => void handleTake()}
                >
                  Tomar
                </Button>
              )}
              {canResolveOrReject && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!canOperate}
                    title={operateHint}
                    onClick={() => setAction('reject')}
                  >
                    Rechazar
                  </Button>
                  <Button size="sm" disabled={!canOperate} title={operateHint} onClick={() => setAction('resolve')}>
                    Resolver
                  </Button>
                </>
              )}
              {canReopen && (
                <Button size="sm" disabled={!canOperate} title={operateHint} onClick={() => setAction('reopen')}>
                  Reabrir
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
