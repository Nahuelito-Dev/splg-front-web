import { MessageCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Drawer, Skeleton } from '../../common/components/ui';
import { usePlatform } from '../../services/queries/supportSessions';
import { SUPPORT_PATH } from './routes';
import { useInboxSummary } from '../../services/queries/inbox';
import { useInboxAccess } from './useInboxAccess';
import { useInboxBridge } from './useInboxBridge';
import { useSupportChatBridge } from './useSupportChatBridge';
import { useSupportSide, useSupportUnread } from './useSupportSide';

const CompanyChatPanel = lazy(() =>
  import('../../pages/Support/CompanyChatPanel').then((m) => ({ default: m.CompanyChatPanel })),
);

/** El título de la pestaña con lo que hay sin leer: «(3) SPLG». */
const useUnreadTitle = (unread: number) => {
  const base = useRef<string | null>(null);
  useEffect(() => {
    base.current ??= document.title.replace(/^\(\d+\) /, '');
    document.title = unread > 0 ? `(${unread}) ${base.current}` : base.current;
  }, [unread]);
  useEffect(
    () => () => {
      if (base.current !== null) document.title = base.current;
    },
    [],
  );
};

const PanelSkeleton = () => (
  <div className="grid gap-3 p-4" aria-label="Cargando el chat">
    <Skeleton className="h-10 w-2/3" />
    <Skeleton className="ml-auto h-10 w-1/2" />
    <Skeleton className="h-10 w-3/5" />
  </div>
);

/**
 * Lo del chat que vive en todo el panel: los puentes del socket (chat con la plataforma y bandeja de la empresa, uno de
 * cada uno), el título de la pestaña con lo sin leer de los dos y, para la empresa, la burbuja «Ayuda» que abre el chat a un costado (a pantalla completa en el
 * celular) sin salir de la pantalla. En «Ayuda» no se muestra: ya se está en el chat.
 */
export const SupportChatHost = () => {
  const side = useSupportSide();
  const platformName = usePlatform().data?.name ?? 'Soporte';
  const unread = useSupportUnread(side);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useSupportChatBridge(side, side === 'company' ? `Mensaje de ${platformName}` : 'Mensaje de una empresa');
  const inbox = useInboxAccess();
  useInboxBridge(inbox.any);
  // Las conversaciones de la bandeja con algo sin leer (no los mensajes): el mismo resumen que la insignia del menú.
  const inboxUnread = useInboxSummary(inbox.any).data?.unread ?? 0;
  useUnreadTitle((side ? unread : 0) + (inbox.any ? inboxUnread : 0));

  const onSupportPage = pathname === SUPPORT_PATH || pathname.startsWith(`${SUPPORT_PATH}/`);
  useEffect(() => {
    if (onSupportPage) setOpen(false);
  }, [onSupportPage]);

  if (side !== 'company' || onSupportPage) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Ayuda: ${unread} sin leer` : `Ayuda: chat con ${platformName}`}
        aria-haspopup="dialog"
        className="fixed bottom-4 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full border border-primary-edge bg-primary px-4 text-sm font-semibold text-on-primary shadow-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <MessageCircle aria-hidden="true" className="h-5 w-5" />
        <span className="hidden sm:inline">Ayuda</span>
        {unread > 0 && (
          <span aria-hidden="true" className="rounded-full bg-on-primary px-1.5 text-xs font-bold text-primary">
            {unread}
          </span>
        )}
      </button>
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
