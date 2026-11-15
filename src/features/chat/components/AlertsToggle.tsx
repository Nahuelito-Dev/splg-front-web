import { BellOff, BellRing } from 'lucide-react';
import { IconButton } from '../../../common/components/ui';
import { useStoredFlag } from '../../../hooks/useStoredFlag';
import { CHAT_ALERTS_KEY, requestNotificationPermission } from '../alerts';

/** Prender o apagar el aviso (notificación y sonido) de mensajes nuevos con la pestaña oculta. Se recuerda. */
export const AlertsToggle = () => {
  const [enabled, setEnabled] = useStoredFlag(CHAT_ALERTS_KEY);
  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      return;
    }
    await requestNotificationPermission();
    setEnabled(true);
  };
  return (
    <IconButton
      label={enabled ? 'Apagar avisos de mensajes nuevos' : 'Avisarme de mensajes nuevos con la pestaña oculta'}
      icon={enabled ? <BellRing /> : <BellOff />}
      active={enabled}
      onClick={() => void toggle()}
    />
  );
};
