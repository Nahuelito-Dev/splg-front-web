import { useEffect, useRef } from 'react';
import { usePlatform } from '../../services/queries/supportSessions';
import { useInboxSummary } from '../../services/queries/inbox';
import { useInboxAccess } from './useInboxAccess';
import { useInboxBridge } from './useInboxBridge';
import { useSupportChatBridge } from './useSupportChatBridge';
import { useSupportSide, useSupportUnread } from './useSupportSide';

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

/**
 * Lo del chat que vive en todo el panel: los puentes del socket (chat con la plataforma y bandeja de la empresa, uno de
 * cada uno) y el título de la pestaña con lo sin leer de los dos. El acceso «Ayuda» está en la barra de arriba
 * (`SupportHelpButton`).
 */
export const SupportChatHost = () => {
  const side = useSupportSide();
  const platformName = usePlatform().data?.name ?? 'Soporte';
  const unread = useSupportUnread(side);
  useSupportChatBridge(side, side === 'company' ? `Mensaje de ${platformName}` : 'Mensaje de una empresa');
  const inbox = useInboxAccess();
  useInboxBridge(inbox.any);
  // Las conversaciones de la bandeja con algo sin leer (no los mensajes): el mismo resumen que la insignia del menú.
  const inboxUnread = useInboxSummary(inbox.any).data?.unread ?? 0;
  useUnreadTitle((side ? unread : 0) + (inbox.any ? inboxUnread : 0));
  return null;
};
