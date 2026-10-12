import { useState } from 'react';
import { Button, ErrorState, Modal, Skeleton, TextArea } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import { useBatchMovements, useBatchReversed, useReverseBatch } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';
import { labelOf, STOCK_CONDITION } from '../../../utils/statusLabels';
import { placeName } from '../stockMath';

interface Props {
  /** El lote que se contraasienta; `null` cierra el modal. */
  batchId: string | null;
  onClose: () => void;
}

/**
 * Contraasiento de un LOTE del libro: revierte todos sus renglones juntos (no hay forma de revertir uno solo). El
 * original no se borra: se anula con asientos nuevos. Muestra todo lo que se va a revertir antes de confirmar.
 */
export const ReverseBatchModal = ({ batchId, onClose }: Props) => {
  const reverse = useReverseBatch();
  const lines = useBatchMovements(batchId ?? undefined);
  const reversed = useBatchReversed(batchId ?? undefined);
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const trimmed = notes.trim();
  const ready = lines.isSuccess && reversed.isSuccess && !reversed.data;

  const submit = () => {
    setTouched(true);
    if (!batchId || !trimmed || !ready) return;
    setServerError(null);
    reverse.mutate(
      { batchId, body: { notes: trimmed }, scope: `reverse:${batchId}` },
      {
        onSuccess: () => {
          notify.success('Lote contraasentado');
          setNotes('');
          setTouched(false);
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open={batchId !== null}
      onClose={onClose}
      size="md"
      title="Contraasentar el lote"
      description="Se revierte el lote completo, con todos sus renglones, no uno solo. El original queda en el libro."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" onClick={submit} loading={reverse.isPending} disabled={!ready}>
            Contraasentar lote
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {lines.isError ? (
          <ErrorState error={lines.error} resource="El lote" onRetry={() => void lines.refetch()} />
        ) : lines.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div>
            <p className="text-sm font-medium text-ink">
              Se revierten {lines.data.data.length} {lines.data.data.length === 1 ? 'renglón' : 'renglones'}:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">
              {lines.data.data.map((m) => (
                <li key={m.movementId}>
                  {m.quantity} {m.gasCylinderType} ({labelOf(STOCK_CONDITION, m.fromCondition).text}):{' '}
                  {placeName(m.from)} → {placeName(m.to)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {reversed.isError && (
          <p role="alert" className="text-sm text-danger">
            No se pudo saber si el lote ya fue contraasentado, así que no se ofrece contraasentar.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void reversed.refetch()}>
              Reintentar
            </button>
          </p>
        )}
        {reversed.data && (
          <p role="alert" className="text-sm text-danger">
            Este lote ya fue contraasentado.
          </p>
        )}
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <TextArea
          label="Motivo del contraasiento"
          required
          value={notes}
          error={touched && !trimmed ? 'Escribí el motivo' : undefined}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
};
