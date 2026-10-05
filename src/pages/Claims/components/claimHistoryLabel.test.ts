import { describe, expect, it } from 'vitest';
import { actorLabel, claimHistoryLabel } from './claimHistoryLabel';

const entry = (httpMethod: string, path: string, extra: Record<string, unknown> = {}) => ({
  httpMethod,
  path,
  result: 'success' as const,
  changes: null,
  ...extra,
});

describe('claimHistoryLabel', () => {
  it.each([
    ['POST', '/api/claims', 'Creó el reclamo'],
    ['POST', '/api/claims/:id/photo', 'Adjuntó una foto'],
    ['PATCH', '/api/claims/:id/take', 'Tomó el reclamo'],
    ['PATCH', '/api/claims/:id/reopen', 'Reabrió el reclamo'],
  ])('%s %s -> %s', (method, path, expected) => {
    expect(claimHistoryLabel(entry(method, path))).toBe(expected);
  });

  it('resolver distingue resuelto de rechazado según lo enviado', () => {
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/resolve', { changes: { status: 'resolved' } }))).toBe(
      'Resolvió el reclamo',
    );
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/resolve', { changes: { status: 'rejected' } }))).toBe(
      'Rechazó el reclamo',
    );
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/resolve', { changes: { status: 'in_process' } }))).toBe(
      'Cambió el estado a En proceso',
    );
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/resolve'))).toBe('Modificó el reclamo');
  });

  it('un status heredado del prototipo (constructor) no rompe ni se toma como estado', () => {
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/resolve', { changes: { status: 'constructor' } }))).toBe(
      'Modificó el reclamo',
    );
    expect(actorLabel('constructor')).toBe('constructor');
  });

  it('un intento fallido lo dice en palabras', () => {
    expect(claimHistoryLabel(entry('PATCH', '/api/claims/:id/take', { result: 'failure' }))).toBe(
      'No se pudo tomar el reclamo',
    );
  });

  it('lo desconocido cae en un texto genérico, sin método ni ruta', () => {
    for (const result of ['success', 'failure'] as const) {
      const label = claimHistoryLabel(entry('DELETE', '/api/claims/:id/algo-nuevo', { result }));
      expect(label).not.toMatch(/DELETE|\/api|:id|algo-nuevo/);
    }
  });
});

describe('actorLabel', () => {
  it('traduce el rol y cae en Sistema sin usuario', () => {
    expect(actorLabel('admin')).toBe('Admin');
    expect(actorLabel('delivery')).toBe('Chofer');
    expect(actorLabel(null)).toBe('Sistema');
  });
});
