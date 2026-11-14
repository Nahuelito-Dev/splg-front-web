import { useEffect } from 'react';
import { useSocketContext } from '../context/useSocketContext';
import { syncSupportMode } from '../services/queries/supportSessions';

/** Evento que el back manda a la sala del usuario cuando su sesión de soporte se revoca o vence (§4.8). */
export const SUPPORT_ENDED_EVENT = 'support:ended';

/**
 * Sale del modo soporte al instante cuando llega `support:ended`: se le pregunta a la API (que es la fuente de
 * verdad) en vez de esperar el sondeo de 30 s. Si el evento no llega, el sondeo lo cubre igual.
 */
export const useSupportEndedEvent = (enabled: boolean) => {
  const { subscribe } = useSocketContext();
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribe(SUPPORT_ENDED_EVENT, () => void syncSupportMode());
  }, [enabled, subscribe]);
};
