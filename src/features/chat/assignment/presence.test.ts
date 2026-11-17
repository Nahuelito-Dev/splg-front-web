import { describe, expect, it } from 'vitest';
import { agentPresence } from './presence';

describe('agentPresence: el estado que se muestra de alguien del equipo', () => {
  it('ausente gana siempre', () => {
    expect(agentPresence({ status: 'away', connected: true, available: false }, true)).toBe('away');
  });

  it('disponible es «En línea» (también desconectada hace menos de 2 minutos)', () => {
    expect(agentPresence({ status: 'online', connected: true, available: true }, true)).toBe('online');
    expect(agentPresence({ status: 'online', connected: false, available: true }, true)).toBe('online');
  });

  it('en línea, con el panel abierto y no disponible: fuera de horario; sin `openNow`, no se deduce', () => {
    expect(agentPresence({ status: 'online', connected: true, available: false }, true)).toBe('out_of_hours');
    expect(agentPresence({ status: 'online', connected: true, available: false })).toBe('disconnected');
  });

  it('en línea, sin panel y no disponible: desconectada; si la empresa está cerrada, fuera de horario', () => {
    expect(agentPresence({ status: 'online', connected: false, available: false }, true)).toBe('disconnected');
    expect(agentPresence({ status: 'online', connected: false, available: false })).toBe('disconnected');
    expect(agentPresence({ status: 'online', connected: false, available: false }, false)).toBe('out_of_hours');
  });
});
