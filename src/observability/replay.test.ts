import type { Event, ReplayFrameEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { createRecordingFilter, ownOrigins, replayEventScrubIntegration, scrubReplayEvent } from './replay';

const filter = createRecordingFilter(ownOrigins('https://api.splg.com/api', 'https://splg-gas.web.app'));

/** Un span de rendimiento como lo arma Replay (`createPerformanceSpans`). */
const span = (op: string, description: string, data: Record<string, unknown> = {}) =>
  ({
    type: 5,
    timestamp: 1,
    data: { tag: 'performanceSpan', payload: { op, description, startTimestamp: 1, endTimestamp: 2, data } },
  }) as ReplayFrameEvent;

const crumb = (payload: Record<string, unknown>) =>
  ({
    type: 5,
    timestamp: 1,
    data: { tag: 'breadcrumb', payload: { timestamp: 1, type: 'default', ...payload } },
  }) as ReplayFrameEvent;

const payloadOf = (event: ReplayFrameEvent | null) => event?.data.payload as Record<string, unknown> | undefined;

describe('grabación de Replay: URLs sin query', () => {
  it('la carga inicial (navigation.navigate) va sin query', () => {
    const out = filter(span('navigation.navigate', 'https://splg-gas.web.app/customers?search=30123456'));
    expect(payloadOf(out)?.description).toBe('https://splg-gas.web.app/customers');
  });

  it('una navegación del router (navigation.push) va sin query, también la anterior', () => {
    const out = filter(
      span('navigation.push', '/customers?search=3764123456', { previous: '/support?session=ses-1#chat' }),
    );
    expect(payloadOf(out)?.description).toBe('/customers');
    expect(payloadOf(out)?.data).toEqual({ previous: '/support' });
  });

  it('los recursos propios quedan, sin query', () => {
    expect(
      payloadOf(filter(span('resource.script', 'https://splg-gas.web.app/assets/index.js?v=2')))?.description,
    ).toBe('https://splg-gas.web.app/assets/index.js');
    expect(
      payloadOf(filter(span('resource.fetch', 'https://api.splg.com/api/v1/customers?search=ana', { method: 'GET' })))
        ?.description,
    ).toBe('https://api.splg.com/api/v1/customers');
  });

  it.each([
    'https://splg-files.s3.sa-east-1.amazonaws.com/docs/dni.jpg?X-Amz-Signature=abc&X-Amz-Credential=x',
    'https://maps.googleapis.com/maps/api/js?key=clave',
    'https://firebasestorage.googleapis.com/v0/b/x/o/foto.png?token=abc',
  ])('un recurso de un dominio ajeno se descarta: %s', (url) => {
    expect(filter(span('resource.img', url))).toBeNull();
    expect(filter(span('resource.xhr', url))).toBeNull();
  });

  it('los spans sin URL (web vitals, memoria) pasan', () => {
    const vital = span('web-vital', 'largest-contentful-paint', { value: 1200 });
    expect(filter(vital)).toEqual(vital);
  });

  it('los breadcrumbs de la grabación pasan por el mismo filtro: click sin atributos ni texto', () => {
    const out = filter(
      crumb({
        category: 'ui.click',
        message: 'div.row > button.btn[aria-label="Juan Pérez"][title="dni-30123456.pdf"]',
        data: {
          nodeId: 12,
          node: {
            id: 12,
            tagName: 'button',
            textContent: 'Juan Pérez',
            attributes: { id: 'ver', class: 'btn', 'aria-label': 'Juan Pérez', title: 'dni.pdf', alt: 'foto' },
          },
        },
      }),
    );
    expect(payloadOf(out)?.message).toBe('div.row > button.btn');
    expect(payloadOf(out)?.data).toEqual({
      nodeId: 12,
      node: { id: 12, tagName: 'button', attributes: { id: 'ver', class: 'btn' } },
    });
  });

  it('las opciones y demás eventos propios de Replay no se tocan', () => {
    const options = {
      type: 5,
      timestamp: 1,
      data: { tag: 'options', payload: { maskAllText: true } },
    } as unknown as ReplayFrameEvent;
    expect(filter(options)).toBe(options);
  });
});

describe('replay_event: urls y request.url sin query', () => {
  it('limpia las URLs del segmento', () => {
    const event = {
      type: 'replay_event',
      urls: ['https://splg-gas.web.app/customers?search=30123456', '/support?session=ses-1'],
      request: { url: 'https://splg-gas.web.app/customers?search=30123456', headers: { 'User-Agent': 'Chrome' } },
    } as unknown as Event;
    expect(scrubReplayEvent(event)).toEqual({
      type: 'replay_event',
      urls: ['https://splg-gas.web.app/customers', '/support'],
      request: { url: 'https://splg-gas.web.app/customers', headers: { 'User-Agent': 'Chrome' } },
    });
  });

  it('a los errores y transacciones no los toca (los limpia beforeSend)', () => {
    const event: Event = { message: 'x', request: { url: 'https://x/?a=1' } };
    expect(scrubReplayEvent(event)).toBe(event);
  });

  it('está como integración con procesador de eventos', () => {
    const integration = replayEventScrubIntegration();
    const out = integration.processEvent?.(
      { type: 'replay_event', urls: ['/a?b=1'] } as unknown as Event,
      {},
      undefined as never,
    ) as unknown as { urls: string[] };
    expect(out.urls).toEqual(['/a']);
  });
});
