import { useEffect, useState } from 'react';
import { usePermissions } from '../../../hooks';
import { AuditHistoryLink, Badge, Button, DetailList, Drawer, TextArea } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { useClaim, useReopenClaim, useResolveClaim, useTakeClaim } from '../../../services/queries/claims';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';
import { ClaimHistory } from './ClaimHistory';
import { ClaimPhoto } from './ClaimPhoto';

export type PendingAction = 'resolve' | 'reject' | 'reopen' | null;

interface Props {
  open: boolean;
  onClose: () => void;
  claim: Claim | null;
  /** Abre el panel ya en «Rechazar» (la baja del reclamo desde la fila de la tabla). */
  startAction?: PendingAction;
  /** Editar lo maneja la página (abre su propio modal). */
  onEdit?: (claim: Claim) => void;
}

/**
 * Ficha de un reclamo (CU-025): historial de la auditoría y las cuatro
 * acciones de la máquina de estados — Tomar, Resolver, Rechazar, Reabrir.
 * Cada una pide confirmación; resolver/rechazar/reabrir, además, un motivo.
 */
export const ClaimDetailDrawer = ({ open, onClose, claim: listed, startAction = null, onEdit }: Props) => {
  const [action, setAction] = useState<PendingAction>(startAction);
  // El listado ya trae al cliente; el detalle suma el pedido y siempre es el dato fresco.
  const { data: fresh } = useClaim(open ? listed?.claim_id : undefined);
  const claim = fresh ?? listed;
  const [note, setNote] = useState('');
  const { canOperate, operateHint } = usePermissions();
  const takeClaim = useTakeClaim();
  const resolveClaim = useResolveClaim();
  const reopenClaim = useReopenClaim();

  useEffect(() => {
    if (open) {
      setAction(startAction);
      setNote('');
    }
    // Sólo al abrir o cambiar de reclamo: un refresco del detalle no tiene que cerrar lo que se está escribiendo.
  }, [open, listed?.claim_id, startAction]);

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
    <Drawer
      open={open}
      onClose={onClose}
      title="Gestionar reclamo"
      description={`${formatShortId(claim.claim_id)} · Pedido ${formatShortId(claim.order_id)}`}
      size="md"
      footer={
        action ? (
          <>
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
          </>
        ) : (
          <>
            {operateHint && <p className="mr-auto text-sm text-muted">{operateHint}</p>}
            {claim.status === 'pending' && onEdit && (
              <Button
                variant="secondary"
                size="sm"
                disabled={!canOperate}
                title={operateHint}
                onClick={() => onEdit(claim)}
              >
                Editar
              </Button>
            )}
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
          </>
        )
      }
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

        <AuditHistoryLink entity="Claim" recordId={claim.claim_id} />

        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(CLAIM_STATUS, claim.status)} /> },
            { label: 'Alta', value: formatDateTime(claim.createdAt) },
            { label: 'Nota de resolución', value: claim.resolutionNote || '—', wide: true },
          ]}
        />

        <ClaimPhoto claim={claim} open={open} canOperate={canOperate} operateHint={operateHint} />

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Historial</h3>
          <ClaimHistory claimId={claim.claim_id} createdAt={claim.createdAt} />
        </div>

        {action && (
          <TextArea label={noteLabel} required rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        )}
      </div>
    </Drawer>
  );
};
