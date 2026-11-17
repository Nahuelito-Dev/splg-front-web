import type { ChatAgent } from '../../../services/api/types';

/** Cómo se nombra cada canal de la bandeja en el equipo. */
const CHANNELS: Record<ChatAgent['channels'][number], string> = {
  staff_customer: 'clientes',
  staff_driver: 'choferes',
};

/** «Clientes», «Choferes» o «Clientes y choferes». */
export const channelsText = (channels: ChatAgent['channels']) => {
  const text = channels.map((c) => CHANNELS[c]).join(' y ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Sin canal';
};

export const loadText = (agent: ChatAgent) => `${agent.openAssigned} de ${agent.maxOpen}`;

export const limitSource = (agent: ChatAgent) =>
  agent.maxOpenOverride === null ? 'Tope de la empresa' : 'Tope propio';
