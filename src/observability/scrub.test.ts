import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { scrubBreadcrumb, scrubErrorEvent, scrubText, scrubTransactionEvent, scrubUrl, scrubValue } from './scrub';

const errorEvent = (event: Partial<ErrorEvent>): ErrorEvent => ({ type: undefined, ...event });

describe('scrubText: datos personales en texto libre', () => {
  it.each([
    ['correo', 'No se encontró ana.perez+1@gmail.com', 'No se encontró [email]'],
    ['correo en una URL', '/users/email/ana%40splg.com', '/users/email/[email]'],
    ['token Bearer', 'Authorization: Bearer abc.def-123', 'Authorization: Bearer [token]'],
    ['JWT suelto', 'token eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl vencido', 'token [token] vencido'],
    ['CUIT', 'CUIT 20-12345678-3 inválido', 'CUIT [cuit] inválido'],
    ['DNI con puntos', 'DNI 12.345.678 repetido', 'DNI [dni] repetido'],
    ['DNI sin puntos', 'dni 30123456.', 'dni [dni].'],
    ['teléfono con +54', 'llamar al +54 9 376 412-3456', 'llamar al [teléfono]'],
    ['teléfono con guiones', 'tel 011 4567-8901', 'tel [teléfono]'],
    ['celular de 10 dígitos', 'cel 3764123456', 'cel [teléfono]'],
  ])('tapa el %s', (_caso, input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it('saca la query y el fragmento de las URL', () => {
    expect(scrubText('GET https://api.splg.com/api/v1/customers?search=ana&page=2 falló')).toBe(
      'GET https://api.splg.com/api/v1/customers falló',
    );
    expect(scrubText('navegó a /customers?search=perez#arriba')).toBe('navegó a /customers');
  });

  it('no toca lo que no es personal: uuids, timestamps, versiones, montos chicos', () => {
    const text = 'Sentry test error 1731800000000 en 3f2a9c1e-1234-4abc-9def-0123456789ab v1.2.3 total 1500';
    expect(scrubText(text)).toBe(text);
  });
});

describe('scrubUrl', () => {
  it('deja sólo el path, sin datos personales', () => {
    expect(scrubUrl('http://localhost:3000/api/v1/users/email/a@b.com?x=1#y')).toBe(
      'http://localhost:3000/api/v1/users/email/[email]',
    );
  });
});

describe('scrubErrorEvent', () => {
  it('limpia mensaje, excepción, request, usuario, breadcrumbs, extra y tags', () => {
    const event = scrubErrorEvent(
      errorEvent({
        message: 'falló para a@b.com',
        exception: { values: [{ type: 'Error', value: 'Bearer secreto123 rechazado para 20-12345678-3' }] },
        request: {
          url: 'https://splg-gas.web.app/customers?search=ana',
          query_string: 'search=ana',
          cookies: { sid: 'x' },
          headers: { Authorization: 'Bearer abc', 'User-Agent': 'Chrome' },
        },
        user: { id: 'u-1', email: 'a@b.com', username: 'Ana', ip_address: '1.2.3.4' },
        breadcrumbs: [{ category: 'xhr', data: { url: 'https://api/x?token=1', method: 'GET' } }],
        extra: { body: { email: 'a@b.com', nombre: 'tel 3764123456' } },
        tags: { request_id: 'req-1' },
      }),
    );
    expect(event.message).toBe('falló para [email]');
    expect(event.exception?.values?.[0]?.value).toBe('Bearer [token] rechazado para [cuit]');
    expect(event.request).toEqual({
      url: 'https://splg-gas.web.app/customers',
      headers: { Authorization: '[filtrado]', 'User-Agent': 'Chrome' },
    });
    expect(event.user).toEqual({ id: 'u-1' });
    expect(event.breadcrumbs?.[0]?.data).toEqual({ url: 'https://api/x', method: 'GET' });
    expect(event.extra).toEqual({ body: { email: '[filtrado]', nombre: 'tel [teléfono]' } });
    expect(event.tags).toEqual({ request_id: 'req-1' });
  });

  it('un usuario sin id no sale', () => {
    expect(scrubErrorEvent(errorEvent({ user: { email: 'a@b.com' } })).user).toBeUndefined();
  });
});

describe('scrubBreadcrumb', () => {
  it('limpia la navegación (from/to con query) y el mensaje de consola', () => {
    const crumb: Breadcrumb = {
      category: 'navigation',
      message: 'login de a@b.com',
      data: { from: '/auth/login?email=a@b.com', to: '/customers?search=ana' },
    };
    expect(scrubBreadcrumb(crumb)).toEqual({
      category: 'navigation',
      message: 'login de [email]',
      data: { from: '/auth/login', to: '/customers' },
    });
  });
});

describe('scrubTransactionEvent', () => {
  it('limpia la descripción y los datos de los spans http', () => {
    const event = scrubTransactionEvent({
      type: 'transaction',
      transaction: '/customers/:id',
      spans: [
        {
          span_id: '1',
          trace_id: '2',
          start_timestamp: 0,
          status: 'ok',
          data: { url: 'http://localhost:3000/api/v1/users/email/a@b.com?x=1' },
          description: 'GET http://localhost:3000/api/v1/users/email/a@b.com?x=1',
        },
      ],
    });
    expect(event.transaction).toBe('/customers/:id');
    expect(event.spans?.[0]?.description).toBe('GET http://localhost:3000/api/v1/users/email/[email]');
    expect(event.spans?.[0]?.data).toEqual({ url: 'http://localhost:3000/api/v1/users/email/[email]' });
  });
});

describe('breadcrumbs de interfaz y consola', () => {
  it('ui.click / ui.input: queda tag, id y clases, sin valores de atributos', () => {
    const out = scrubBreadcrumb({
      category: 'ui.click',
      message: 'td.cell > button#ver.btn.primary[aria-label="Ver a Juan Pérez"][type="button"][title="recibo.pdf"]',
      data: { 'ui.component_name': 'RowActions' },
    });
    expect(out.message).toBe('td.cell > button#ver.btn.primary');
    expect(out.data).toEqual({ 'ui.component_name': 'RowActions' });
    expect(scrubBreadcrumb({ category: 'ui.input', message: 'input.field[name="dni"][alt="x"]' }).message).toBe(
      'input.field',
    );
  });

  it('consola: sin argumentos, sólo el nivel y el primer texto filtrado', () => {
    const out = scrubBreadcrumb({
      category: 'console',
      level: 'error',
      message: 'Falló a@b.com [object Object]',
      data: { logger: 'console', arguments: ['Falló a@b.com', { full_name: 'Juan Pérez', address: 'Calle 1' }] },
    });
    expect(out).toEqual({ category: 'console', level: 'error', message: 'Falló [email]', data: { logger: 'console' } });
  });

  it('consola con un objeto como primer argumento: no queda nada de él', () => {
    const out = scrubBreadcrumb({
      category: 'console',
      level: 'log',
      message: '[object Object]',
      data: { arguments: [{ name: 'Juan' }] },
    });
    expect(out.message).toBe('[filtrado]');
    expect(out.data).toEqual({ logger: 'console' });
  });

  it('en cualquier objeto se tapan full_name, address y firmas', () => {
    expect(scrubValue({ full_name: 'Juan', address: 'Calle 1', 'X-Amz-Signature': 'abc', status: 200 })).toEqual({
      full_name: '[filtrado]',
      address: '[filtrado]',
      'X-Amz-Signature': '[filtrado]',
      status: 200,
    });
  });
});
