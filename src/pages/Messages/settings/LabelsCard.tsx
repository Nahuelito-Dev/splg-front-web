import { Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, CardHeader, EmptyState, ErrorState, RowActions, Skeleton } from '../../../common/components/ui';
import { LabelChip } from '../../../features/chat/labels/LabelChip';
import { LABEL_COLORS } from '../../../features/chat/labels/labelColors';
import { CHAT_LABELS_MAX } from '../../../services/api/chatLabels';
import type { ChatLabel } from '../../../services/api/types';
import { useChatLabels, useDeleteChatLabel, useLabelConversationCount } from '../../../services/queries/chatLabels';
import { formatNumber } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { LabelModal } from './LabelModal';

/**
 * Cuánto se puede contar al dar de baja: `exact` si quien configura atiende los dos canales (la bandeja le cuenta todas);
 * `partial` si atiende uno (las del otro no las ve: el número es un piso); `none` si no atiende ninguno.
 */
export type LabelUsageScope = 'exact' | 'partial' | 'none';

const ALL = 'Sale de todas las conversaciones que la tengan.';

/** «Está en 3 conversaciones y sale de todas.» según lo que se pudo contar. */
const usageText = (count: number | null, scope: LabelUsageScope): string => {
  if (count === null || scope === 'none') return ALL;
  if (scope === 'partial') {
    return count === 0
      ? `${ALL} En los canales que atendés no está en ninguna.`
      : `Está en al menos ${formatNumber(count)} ${count === 1 ? 'conversación' : 'conversaciones'} (contando sólo los canales que atendés) y sale de todas.`;
  }
  return count === 0
    ? 'No está en ninguna conversación.'
    : count === 1
      ? 'Está en 1 conversación y sale de ella.'
      : `Está en ${formatNumber(count)} conversaciones y sale de todas.`;
};

/** Las etiquetas de la bandeja: alta, renombrar, color y baja lógica (sale de todas sus conversaciones). */
export const LabelsCard = ({ canEdit, usage }: { canEdit: boolean; usage: LabelUsageScope }) => {
  const { data, error, isPending, refetch } = useChatLabels();
  const remove = useDeleteChatLabel();
  const countOf = useLabelConversationCount();
  const [editing, setEditing] = useState<ChatLabel | 'new' | null>(null);
  const items = data?.items ?? [];
  const full = items.length >= CHAT_LABELS_MAX;

  const askRemove = async (label: ChatLabel) => {
    const count = usage === 'none' ? null : await countOf(label.id);
    const ok = await confirm({
      title: `¿Dar de baja «${label.name}»?`,
      text: `${usageText(count, usage)} Deja de ofrecerse y no se cuenta en las métricas. El nombre queda libre para otra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(label.id, {
      onSuccess: () => notify.success('Etiqueta dada de baja'),
      onError: (cause) => notify.error(cause),
    });
  };

  const add = canEdit && (
    <Button
      size="sm"
      icon={<Plus />}
      aria-label="Nueva etiqueta"
      onClick={() => setEditing('new')}
      disabled={full}
      title={full ? `Ya hay ${CHAT_LABELS_MAX}: dá de baja alguna para crear otra` : undefined}
    >
      Nueva
    </Button>
  );

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Etiquetas"
        subtitle="Para clasificar las conversaciones de la bandeja y filtrarlas. Sólo las ve el equipo."
        icon={<Tags className="h-4 w-4" />}
        action={add}
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando las etiquetas">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} resource="Las etiquetas" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Sin etiquetas"
          description="Por ejemplo: «Reclamo de envío», «Factura» o «Cliente nuevo». Cada conversación lleva hasta 5."
          action={
            canEdit && (
              <Button variant="secondary" icon={<Plus />} onClick={() => setEditing('new')}>
                Crear la primera
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-outline-soft" aria-label="Etiquetas">
            {items.map((label) => (
              <li key={label.id} className="flex items-center gap-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <LabelChip name={label.name} color={label.color} className="max-w-[16rem]" />
                  <span className="text-xs text-muted">{LABEL_COLORS[label.color].name}</span>
                </div>
                {canEdit && (
                  <RowActions
                    rowLabel={`etiqueta «${label.name}»`}
                    onEdit={() => setEditing(label)}
                    onDelete={() => void askRemove(label)}
                    deleteLabel="Dar de baja"
                  />
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {formatNumber(items.length)} de {CHAT_LABELS_MAX} etiquetas.
            {full && ' Llegaste al tope: dá de baja alguna para crear otra.'}
          </p>
        </>
      )}
      <LabelModal editing={editing} onClose={() => setEditing(null)} />
    </Card>
  );
};
