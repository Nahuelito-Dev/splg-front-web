import { cx } from '../../../common/components/ui/cx';
import { useInboxSummary } from '../../../services/queries/inbox';
import { inboxAttention, inboxAttentionLabel } from '../inbox/inboxAttention';
import { useInboxAccess } from '../useInboxAccess';

/**
 * La insignia de «Mensajes» en el menú: las conversaciones que piden atención (`inboxAttention`: sin asignar, esperando
 * a una persona o con algo sin leer, sin contar dos veces la misma). Comparte el resumen con las pestañas de la bandeja
 * y el título de la pestaña del navegador: no pide nada de más.
 */
export const InboxNavBadge = ({ mini, active }: { mini: boolean; active: boolean }) => {
  const { any } = useInboxAccess();
  const summary = useInboxSummary(any).data;
  const count = summary ? inboxAttention(summary) : 0;
  if (!any || !summary || count <= 0) return null;
  return (
    <span
      className={cx(
        'rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums',
        mini ? 'absolute right-0.5 top-0.5 min-w-[16px] px-1 text-center text-[10px] leading-4' : 'ml-auto',
        active || mini ? 'bg-primary text-on-primary' : 'bg-white/[0.08] text-white',
      )}
      aria-label={inboxAttentionLabel(summary)}
      title={inboxAttentionLabel(summary)}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
