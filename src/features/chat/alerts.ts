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
  notifyHidden(message.conversationId, message.seq, title, (message.body ?? '').slice(0, 140));
};

/** Las notificaciones a la vista, por conversación (el `tag`): para cerrar la de un mensaje que después se borra. */
const shown = new Map<string, { seq: number; notification: Notification }>();

const notifyHidden = (conversationId: string, seq: number, title: string, body?: string) => {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden' || !alertsEnabled()) return;
  beep();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const notification = new Notification(title, { ...(body ? { body } : {}), tag: `chat:${conversationId}` });
  shown.set(conversationId, { seq, notification });
  notification.onclose = () => {
    if (shown.get(conversationId)?.notification === notification) shown.delete(conversationId);
  };
};

/**
 * Aviso de una conversación que no está abierta en pantalla (`chat:inbox`): sin el texto del mensaje, sólo quién
 * escribió («Nuevo mensaje de Lucía»). Misma preferencia y misma regla de la pestaña oculta.
 */
export const alertInboxMessage = (conversationId: string, seq: number, title: string) =>
  notifyHidden(conversationId, seq, title);

/** Un mensaje se borró: si la notificación a la vista era de ese mensaje, se cierra (su texto ya no existe). */
export const dismissAlert = (conversationId: string, seq: number) => {
  const current = shown.get(conversationId);
  if (!current || current.seq !== seq) return;
  current.notification.close();
  shown.delete(conversationId);
};
