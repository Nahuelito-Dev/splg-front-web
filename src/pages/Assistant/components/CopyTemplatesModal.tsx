import { Check, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Modal, Skeleton } from '../../../common/components/ui';
import { useCompanyTemplates } from '../../../services/queries/assistant';
import { copyBlockedReason, copyButtonLabel, templatesToAdd } from '../faqRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Copia las que faltan (`from-templates`). */
  onConfirm: () => void;
  pending: boolean;
  /** Preguntas que tiene hoy la base y su tope: la copia es todo o nada. */
  count: number;
  limit: number;
}

/** Vista previa de las preguntas de ejemplo antes de sumarlas: cuáles ya están en la base y cuántas se van a sumar. */
export const CopyTemplatesModal = ({ open, onClose, onConfirm, pending, count, limit }: Props) => {
  const { data, error, isPending, isFetching, refetch } = useCompanyTemplates(open);
  const items = data ? [...data.items].sort((a, b) => a.position - b.position) : [];
  const toAdd = templatesToAdd(items);
  // Al reabrir el diálogo se vuelve a pedir el catálogo: hasta que llegue, lo que se ve es de antes.
  const refreshing = Boolean(data) && isFetching;
  const staleError = Boolean(data) && Boolean(error) && !isFetching;
  const upToDate = Boolean(data) && !isFetching && !error;
  const blockedReason = copyBlockedReason({ items: data?.items, error, isFetching, count, limit });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title="Cargar preguntas de ejemplo"
      description="Preguntas típicas de una distribuidora para empezar. Se suman a tu base y después las podés ajustar o dar de baja."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button loading={pending} blockedReason={blockedReason} onClick={onConfirm}>
            {copyButtonLabel(toAdd, upToDate)}
          </Button>
        </>
      }
    >
      {isPending && open ? (
        <div role="status" aria-label="Cargando las preguntas de ejemplo" className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data ? (
        <ErrorState error={error} resource="Las preguntas de ejemplo" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay preguntas de ejemplo"
          description="Todavía no hay preguntas de ejemplo para sumar. Mientras tanto, podés escribir las tuyas."
        />
      ) : (
        <div className="space-y-3" aria-busy={refreshing || undefined}>
          {refreshing && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              />
              Actualizando las preguntas de ejemplo…
            </p>
          )}
          {staleError && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between"
            >
              <p>No se pudieron actualizar las preguntas de ejemplo: se muestran las últimas que se cargaron.</p>
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw aria-hidden="true" />}
                onClick={() => void refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}
          {upToDate && (
            <p className="text-sm text-ink" aria-live="polite">
              {toAdd === 0
                ? 'Ya tenés todas en tu base: no hay nada para sumar.'
                : `Se van a sumar ${toAdd} de ${items.length}. Las que ya tenés no se repiten.`}
            </p>
          )}
          <ul className="divide-y divide-outline rounded-xl border border-outline" aria-label="Preguntas de ejemplo">
            {items.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className={
                    item.alreadyInBase
                      ? 'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted text-muted'
                      : 'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-soft text-success'
                  }
                >
                  {item.alreadyInBase ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={item.alreadyInBase ? 'text-sm text-muted' : 'text-sm font-medium text-ink'}>
                    {item.question}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.answer}</p>
                  <Badge
                    className="mt-1.5"
                    label={
                      item.alreadyInBase
                        ? { text: 'Ya está en tu base', tone: 'neutral' }
                        : { text: 'Se suma', tone: 'success' }
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
};
