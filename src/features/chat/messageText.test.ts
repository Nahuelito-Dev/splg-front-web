import { describe, expect, it } from 'vitest';
import { msg } from '../../test/chatFixtures';
import { dayLabel, isOutOfHoursReply, sameGroup, splitLinks, systemText } from './messageText';

describe('texto de los mensajes', () => {
  it('detecta los enlaces y deja la puntuación afuera', () => {
    expect(splitLinks('mirá https://splg.com/ayuda. Gracias')).toEqual([
      { kind: 'text', text: 'mirá ' },
      { kind: 'link', text: 'https://splg.com/ayuda', href: 'https://splg.com/ayuda' },
      { kind: 'text', text: '. Gracias' },
    ]);
  });

  it('no toma como enlace un javascript: ni un HTML', () => {
    expect(splitLinks('javascript:alert(1) <a href="x">y</a>').every((p) => p.kind === 'text')).toBe(true);
  });

  it('separador por día: hoy, ayer o la fecha', () => {
    expect(dayLabel('2026-11-14', '2026-11-14', '2026-11-13')).toBe('Hoy');
    expect(dayLabel('2026-11-13', '2026-11-14', '2026-11-13')).toBe('Ayer');
    expect(dayLabel('2026-11-01', '2026-11-14', '2026-11-13')).toBe('1 nov 2026');
  });

  it('agrupa por punta y minuto', () => {
    const a = msg(1, { createdAt: '2026-11-14T15:01:05.000Z' });
    expect(sameGroup(a, msg(2, { createdAt: '2026-11-14T15:01:40.000Z' }))).toBe(true);
    expect(sameGroup(a, msg(2, { createdAt: '2026-11-14T15:02:00.000Z' }))).toBe(false);
    expect(sameGroup(a, msg(2, { createdAt: '2026-11-14T15:01:40.000Z', party: 'company' }))).toBe(false);
  });

  it('los mensajes de sistema se arman en castellano con su clave', () => {
    const opened = msg(3, {
      kind: 'system',
      party: 'system',
      systemCode: 'ticket_opened',
      payload: { ticketId: 't-1', number: 'T-000007', subject: 'Factura' },
    });
    expect(systemText(opened, 'OrixTech')).toBe('Se abrió el ticket T-000007: Factura');
    const changed = msg(4, {
      kind: 'system',
      party: 'system',
      systemCode: 'ticket_status_changed',
      payload: { ticketId: 't-1', number: 'T-000007', from: 'open', to: 'resolved' },
    });
    expect(systemText(changed, 'OrixTech')).toBe('El ticket T-000007 pasó a «Resuelto»');
  });

  it('reconoce la respuesta automática fuera de horario', () => {
    expect(isOutOfHoursReply(msg(1, { kind: 'auto_reply', templateKey: 'fuera_de_horario' }))).toBe(true);
    expect(isOutOfHoursReply(msg(1, { kind: 'auto_reply', templateKey: 'recibido' }))).toBe(false);
  });
});

describe('avisos del cierre por inactividad en la bandeja (7c)', () => {
  const system = (systemCode: 'inactivity_warning' | 'closed_inactivity', payload: Record<string, unknown> | null) =>
    msg(5, { party: 'system', kind: 'system', systemCode, payload, body: 'texto del back' });

  it('el aviso dice en cuánto se cierra (en horas si corresponde); sin plazo, igual se entiende', () => {
    expect(systemText(system('inactivity_warning', { minutes: 90 }), 'SPLG', 'inbox')).toBe(
      'Se avisó que la conversación se cierra en 1 h 30 min si no hay respuesta',
    );
    expect(systemText(system('inactivity_warning', null), 'SPLG', 'inbox')).toBe(
      'Se avisó que la conversación se cierra si no hay respuesta',
    );
  });

  it('el cierre explica que fue solo', () => {
    expect(systemText(system('closed_inactivity', null), 'SPLG', 'inbox')).toBe(
      'Se cerró sola por inactividad: no hubo respuesta en el plazo de la configuración',
    );
  });
});
