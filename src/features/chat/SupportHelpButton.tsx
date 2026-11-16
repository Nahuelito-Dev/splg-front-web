import { Tooltip } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Drawer, Skeleton } from '../../common/components/ui';
import { usePlatform } from '../../services/queries/supportSessions';
import { SUPPORT_PATH } from './routes';
import { useSupportSide, useSupportUnread } from './useSupportSide';

const CompanyChatPanel = lazy(() =>
  import('../../pages/Support/CompanyChatPanel').then((m) => ({ default: m.CompanyChatPanel })),
);

const PanelSkeleton = () => (
  <div className="grid gap-3 p-4" aria-label="Cargando el chat">
    <Skeleton className="h-10 w-2/3" />
    <Skeleton className="ml-auto h-10 w-1/2" />
    <Skeleton className="h-10 w-3/5" />
  </div>
);

/**
 * «Ayuda» en la barra de arriba, junto a la campana: para la empresa, abre el chat con la plataforma a un costado (a
 * pantalla completa en el celular) sin salir de la pantalla. Al estar en la barra no tapa nada del contenido. En la
 * pantalla «Ayuda» no se muestra: ya se está en el chat.
 */
export const SupportHelpButton = () => {
  const side = useSupportSide();
  const platformName = usePlatform().data?.name ?? 'Soporte';
  const unread = useSupportUnread(side);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const onSupportPage = pathname === SUPPORT_PATH || pathname.startsWith(`${SUPPORT_PATH}/`);
  useEffect(() => {
    if (onSupportPage) setOpen(false);
  }, [onSupportPage]);

  if (side !== 'company' || onSupportPage) return null;
  return (
    <>
      <Tooltip title="Ayuda" arrow>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread > 0 ? `Ayuda: ${unread} sin leer` : `Ayuda: chat con ${platformName}`}
          aria-haspopup="dialog"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-outline bg-surface text-ink-2 shadow-control transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <MessageCircle aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-primary px-1 text-[10px] font-bold leading-none text-on-primary tabular-nums"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Tooltip>
      <Drawer open={open} onClose={() => setOpen(false)} title={`Chat con ${platformName}`}>
        <div className="-m-5 flex h-[calc(100%+2.5rem)] min-h-[60vh] flex-col">
          <Suspense fallback={<PanelSkeleton />}>
            <CompanyChatPanel compact />
          </Suspense>
        </div>
      </Drawer>
    </>
  );
};
