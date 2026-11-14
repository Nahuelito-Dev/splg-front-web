import { describe, expect, it } from 'vitest';
import { activityAction, activityArea, routeOf, supportAccessAction } from './activityLabels';

const request = (method: string, path: string, resource = 'x') => ({
  kind: 'request' as const,
  method,
  path,
  resource,
});

describe('auditoría de plataforma en castellano', () => {
  it('quita el prefijo y la versión de la ruta', () => {
    expect(routeOf('/api/v2/platform/companies/:id')).toBe('/platform/companies/:id');
    expect(routeOf('/api/role/:id')).toBe('/role/:id');
  });

  it.each([
    ['PUT', '/api/v2/platform/companies/:id/owned-by-platform', 'Marcó o desmarcó la empresa propia'],
    ['PUT', '/api/v2/platform/companies/:id/scheduled-tasks', 'Cambió las frecuencias de las tareas programadas'],
    ['POST', '/api/v2/support-sessions', 'Pidió acceso de soporte'],
    ['POST', '/api/v2/support-access/:id/approve', 'Aprobó un acceso de soporte'],
    ['DELETE', '/api/v1/distributor/:id', 'Dio de baja una empresa'],
    ['PATCH', '/api/role/:id', 'Modificó un rol'],
  ])('%s %s → %s', (method, path, text) => {
    expect(activityAction(request(method, path))).toBe(text);
  });

  it('lo que no está en el mapa se lee como verbo y área, aunque la API informe «v1» como recurso', () => {
    expect(activityAction(request('PATCH', '/api/v1/gascylinder/:id/reactivate', 'gascylinder'))).toBe(
      'Modificó · Garrafas',
    );
    expect(activityArea(request('DELETE', '/api/v1/customers/:id', 'v1'))).toBe('Clientes');
    expect(activityAction(request('POST', '/api/v9/algo-nuevo', 'algo-nuevo'))).toBe('Creó o ejecutó · Otra pantalla');
  });

  it('un ingreso al panel', () => {
    const login = { kind: 'login' as const, method: null, path: null, resource: 'auth' };
    expect(activityAction(login)).toBe('Ingresó al panel');
    expect(activityArea(login)).toBe('Panel');
  });

  it('nunca devuelve la ruta cruda', () => {
    expect(activityAction(request('PUT', '/api/v2/cylinders/:id/photo', 'cylinders'))).not.toMatch(/\/|:id/);
  });
});

describe('lo que miró el soporte, en castellano', () => {
  it('una lectura se lee «Consultó · área», sin método ni ruta', () => {
    const text = supportAccessAction({ httpMethod: 'GET', path: '/api/v2/orders/3f1c2a', resource: 'orders' });
    expect(text).toBe('Consultó · Pedidos');
    expect(text).not.toMatch(/GET|\/api|orders/);
  });

  it('sin recurso informado sale de la ruta; lo desconocido no muestra la ruta', () => {
    expect(supportAccessAction({ httpMethod: 'GET', path: '/api/v1/customers', resource: null })).toBe(
      'Consultó · Clientes',
    );
    expect(supportAccessAction({ httpMethod: 'GET', path: '/api/v2/algo-raro/1', resource: null })).toBe(
      'Consultó · Otra pantalla',
    );
  });

  it('lo que no es lectura se lee como en la auditoría de plataforma', () => {
    expect(supportAccessAction({ httpMethod: 'DELETE', path: '/api/v2/support-sessions/:id', resource: null })).toBe(
      'Salió del modo soporte o retiró el pedido',
    );
  });
});
