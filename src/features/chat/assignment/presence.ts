import type { ChatAgent } from '../../../services/api/types';
import type { CHAT_AGENT_PRESENCE } from '../../../utils/statusLabels';

export type AgentPresence = keyof typeof CHAT_AGENT_PRESENCE;

type PresenceInput = Pick<ChatAgent, 'status' | 'connected' | 'available'>;

/**
 * El estado que se muestra de una persona del equipo. `available` lo calcula la API: «En línea», conectada al panel (o
 * desconectada hace menos de 2 minutos) y en horario. Si está «En línea» pero no disponible, el motivo se deduce: sin
 * el panel abierto, «Desconectada»; con el panel abierto (o con la empresa cerrada según `openNow`), «Fuera de
 * horario». Sin `openNow` (quien mira no puede leer el horario) no se deduce el horario: «Desconectada». Una persona
 * desconectada hace menos de 2 minutos sigue disponible: «En línea».
 */
export const agentPresence = ({ status, connected, available }: PresenceInput, openNow?: boolean): AgentPresence => {
  if (status === 'away') return 'away';
  if (available) return 'online';
  if (openNow === undefined) return 'disconnected';
  if (openNow === false || connected) return 'out_of_hours';
  return 'disconnected';
};
