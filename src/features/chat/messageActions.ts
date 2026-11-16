import { useEffect, useState } from 'react';
import type { ChatMessage } from './thread';

/** Cuánto dura la ventana para editar un mensaje propio (D-C22, igual que el back). */
export const EDIT_WINDOW_MS = 15 * 60_000;

/** El id del elemento de un mensaje, para llevar la vista a él desde una cita. */
export const messageDomId = (conversationId: string, seq: number) => `chat-msg-${conversationId}-${seq}`;

/** Se puede editar ahora: lo dice la API (`canEdit`) y todavía no pasaron los 15 minutos. */
export const canEditNow = (message: ChatMessage, now = Date.now()): boolean =>
  Boolean(message.canEdit) &&
  !message.deleted &&
  message.kind === 'text' &&
  now - Date.parse(message.createdAt) < EDIT_WINDOW_MS;

/**
 * Si se puede editar ahora, y vuelve a dibujar justo cuando vencen los 15 minutos: «Editar» desaparece solo, sin
 * esperar a otro render. Lo decide la API (`canEdit`, de quien mira) y el reloj; nunca se supone de más.
 */
export const useCanEditNow = (message: ChatMessage): boolean => {
  const [now, setNow] = useState(() => Date.now());
  const deadline = Date.parse(message.createdAt) + EDIT_WINDOW_MS;
  const candidate = Boolean(message.canEdit) && !message.deleted && message.kind === 'text';
  useEffect(() => {
    if (!candidate) return;
    const wait = deadline - Date.now();
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait + 50);
    return () => window.clearTimeout(timer);
  }, [candidate, deadline]);
  return candidate && canEditNow(message, Math.max(now, Date.now()));
};
