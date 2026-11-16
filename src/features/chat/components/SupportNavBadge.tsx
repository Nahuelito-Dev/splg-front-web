import { cx } from '../../../common/components/ui/cx';
import { useCompanySupportSummary, usePlatformSupportSummary } from '../../../services/queries/supportChat';
import { useSupportSide } from '../useSupportSide';

interface Props {
  /** `all`: todo lo sin leer (la «Ayuda» de la empresa); `chats` / `tickets`: lo de la plataforma por separado. */
  which: 'all' | 'chats' | 'tickets';
  mini: boolean;
  active: boolean;
}

/**
 * La insignia de lo sin leer en el menú lateral. Lee el mismo contador que el resto del panel (`…/support/summary`,
 * una sola consulta por clave): no pide nada de más.
 */
export const SupportNavBadge = ({ which, mini, active }: Props) => {
  const side = useSupportSide();
  const company = useCompanySupportSummary(side === 'company');
  const platform = usePlatformSupportSummary(side === 'platform');
  const count =
    side === 'company'
      ? (company.data?.total ?? 0)
      : side === 'platform'
        ? which === 'chats'
          ? (platform.data?.chatsUnread ?? 0)
          : which === 'tickets'
            ? (platform.data?.ticketsUnread ?? 0)
            : (platform.data?.total ?? 0)
        : 0;
  if (count <= 0) return null;
  return (
    <span
      className={cx(
        'rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums',
        mini ? 'absolute right-0.5 top-0.5 min-w-[16px] px-1 text-center text-[10px] leading-4' : 'ml-auto',
        active || mini ? 'bg-primary text-on-primary' : 'bg-white/[0.08] text-white',
      )}
      aria-label={`${count} sin leer`}
    >
      {count}
    </span>
  );
};
