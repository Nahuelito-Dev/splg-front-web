import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
  it('una pantalla del menú: sección › pantalla', () => {
    expect(buildBreadcrumbs('/customers')).toEqual([{ label: 'Clientes y flota' }, { label: 'Clientes' }]);
  });

  it('el detalle lleva a la lista y termina en «Detalle»', () => {
    expect(buildBreadcrumbs('/customers/details/abc')).toEqual([
      { label: 'Clientes y flota' },
      { label: 'Clientes', to: '/customers' },
      { label: 'Detalle' },
    ]);
  });

  it('el detalle de un pedido muestra su id corto, sacado de la URL', () => {
    expect(buildBreadcrumbs('/orders/9f1c2b7a-aaaa-bbbb-cccc-0123456abcde').at(-1)).toEqual({ label: '#6ABCDE' });
  });

  it('el alta: «Nuevo»', () => {
    expect(buildBreadcrumbs('/orders/new').at(-1)).toEqual({ label: 'Nuevo' });
  });

  it('elige la pantalla más específica (fleet/plans y no otra)', () => {
    expect(buildBreadcrumbs('/fleet/plans/7')).toEqual([
      { label: 'Clientes y flota' },
      { label: 'Planes de flota', to: '/fleet/plans' },
      { label: 'Detalle' },
    ]);
  });

  it('Mi cuenta no tiene sección', () => {
    expect(buildBreadcrumbs('/account')).toEqual([{ label: 'Mi cuenta' }]);
  });

  it('una ruta que no está en el menú no inventa migas, y la barra final no cuenta', () => {
    expect(buildBreadcrumbs('/nada')).toEqual([]);
    expect(buildBreadcrumbs('/orders/')).toEqual([{ label: 'Operación' }, { label: 'Pedidos' }]);
  });
});
