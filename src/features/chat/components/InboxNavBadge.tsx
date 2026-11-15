import { cx } from '../../../common/components/ui/cx';
import { useInboxUnread } from '../../../services/queries/inbox';
import { useInboxAccess } from '../useInboxAccess';

/**
 * La insignia de «Mensajes» en el menú: lo sin leer de la bandeja (clientes y choferes de los canales que atiende quien
 * mira). Comparte la consulta con el título de la pestaña: no pide nada de más.
 */
export const InboxNavBadge = ({ mini, active }: { mini: boolean; active: boolean }) => {
  const { any } = useInboxAccess();
  const count = useInboxUnread(any).data ?? 0;
  if (!any || count <= 0) return null;
  return (
    <span
      className={cx(
        'rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums',
        mini ? 'absolute right-0.5 top-0.5 min-w-[16px] px-1 text-center text-[10px] leading-4' : 'ml-auto',
        active || mini ? 'bg-primary text-on-primary' : 'bg-white/[0.08] text-white',
      )}
      aria-label={`${count} sin leer`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
