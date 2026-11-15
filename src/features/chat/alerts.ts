import type { MessageDto } from '../../services/api/types';

/** Preferencia del navegador: avisar con notificación y sonido los mensajes nuevos con la pestaña oculta. */
export const CHAT_ALERTS_KEY = 'supportChatAlerts';

export const alertsEnabled = (): boolean => {
  try {
    return localStorage.getItem(CHAT_ALERTS_KEY) === '1';
  } catch {
    return false;
  }
};

/** Pide permiso de notificaciones (si el navegador las tiene). Devuelve si quedaron permitidas. */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
};

/** Un tono corto, sin archivos: lo arma el navegador. Si no puede (sin audio, bloqueado), no suena y no pasa nada. */
const beep = () => {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
    oscillator.onended = () => void context.close();
  } catch {
    // sin audio: sólo la notificación
  }
};

/**
 * Avisa un mensaje de la otra punta sólo si la pestaña está oculta y la preferencia está prendida: con la pestaña a la
 * vista ya se ve en el hilo y en la insignia. Nunca un mensaje propio ni uno de sistema.
 */
export const alertIncoming = (message: MessageDto, title: string) => {
  if (message.isMine || message.party === 'system' || message.visibility === 'internal') return;
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden' || !alertsEnabled()) return;
  beep();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const body = (message.body ?? '').slice(0, 140);
  new Notification(title, { body, tag: `chat:${message.conversationId}` });
};
