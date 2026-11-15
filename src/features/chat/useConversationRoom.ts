import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSocketContext } from '../../context/useSocketContext';
import { catchUpThread, forgetEarly } from '../../services/queries/chatThread';
import { chatKeys } from '../../services/queries/supportChat';

/** Respuesta del servidor a `chat:join` / `chat:leave`. */
export type RoomAck = { ok: true } | { ok: false; code: string; message: string };

export const JOIN_EVENT = 'chat:join';
export const LEAVE_EVENT = 'chat:leave';

/**
 * Entra a la sala de una conversación mientras la pantalla está abierta (D-C28): el servidor valida que sea de quien
 * pide y responde con un ack. Al reconectar el servidor la olvida, así que se vuelve a entrar; cada entrada pone al
 * día el hilo DESPUÉS de cualquier carga en curso (lo que pasó entre la foto del GET y la entrada, o mientras no hubo
 * conexión). Al salir se olvida lo que hubiera quedado en el búfer del hilo.
 */
export const useConversationRoom = (conversationId: string | null) => {
  const { isOnline, request } = useSocketContext();
  const queryClient = useQueryClient();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!conversationId || !isOnline) return;
    let active = true;
    request<RoomAck>(JOIN_EVENT, { conversationId })
      .then((ack) => {
        if (!active) return;
        setJoined(ack.ok);
        if (ack.ok) void catchUpThread(queryClient, chatKeys.thread(conversationId));
      })
      .catch(() => {
        if (active) setJoined(false);
      });
    return () => {
      active = false;
      setJoined(false);
      forgetEarly(queryClient, conversationId);
      request<RoomAck>(LEAVE_EVENT, { conversationId }).catch(() => undefined);
    };
  }, [conversationId, isOnline, queryClient, request]);

  return { joined: joined && isOnline, isOnline };
};
