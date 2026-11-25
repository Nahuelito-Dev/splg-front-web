import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationLogItem } from '../../services/api/types';

const perms = vi.hoisted(() => ({ value: { needsDistributor: false } as Record<string, unknown> }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms.value,
  useDebounce: <T,>(value: T) => value,
}));

const ORDER = '00000000-0000-4000-8000-000000abc123';
const item = (id: string, over: Partial<NotificationLogItem> = {}): NotificationLogItem => ({
  notificationLogId: `00000000-0000-4000-8000-0000000000${id}`,
  createdAt: '2026-11-24T15:30:00Z',
  channel: 'email',
  type: 'ORDER_CONFIRMATION',
  recipientMasked: 'n***@dominio.com',
  subject: 'Tu pedido está confirmado',
  status: 'sent',
  error: null,
  orderId: ORDER,
  distributorId: 'd1',
  ...over,
});

const ROWS = [
  item('01'),
  item('02', {
    channel: 'push',
    type: 'ORDER_ARRIVED',
    recipientMasked: '***abc123',
    subject: '¡Tu pedido llegó!',
    status: 'failed',
    error: 'token inválido',
  }),
  item('03', { type: 'CODIGO_NUEVO', status: 'skipped', error: 'sin configurar', orderId: null, subject: null }),
];

const list = vi.hoisted(() => ({ filters: [] as unknown[], enabled: [] as boolean[] }));
vi.mock('../../services/queries/notificationLog', () => ({
  useNotificationLog: (filters: unknown, enabled: boolean) => {
    list.filters.push(filters);
    list.enabled.push(enabled);
    return { data: { data: ROWS, total: ROWS.length, limit: 10, offset: 0 }, isLoading: false, isFetching: false };
  },
}));

import { SentNotifications } from './SentNotifications';

const Search = () => <output data-testid="search">{useLocation().search}</output>;
const renderPage = (url = '/sent-notifications') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <SentNotifications />
      <Search />
    </MemoryRouter>,
  );
const lastFilters = () => list.filters[list.filters.length - 1];

beforeEach(() => {
  list.filters = [];
  list.enabled = [];
  perms.value = { needsDistributor: false };
});
afterEach(cleanup);

describe('SentNotifications en el celular (320 px)', () => {
  const original = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it('la tabla pasa a tarjetas: sin grilla, un aviso por tarjeta con su estado', () => {
    renderPage();
    expect(screen.queryByRole('grid')).toBeNull();
    // Cada estado está en la tarjeta y en las opciones del filtro «Estado».
    expect(screen.getAllByText('Enviado')).toHaveLength(2);
    expect(screen.getAllByText('Falló')).toHaveLength(2);
    expect(screen.getAllByText('No salió')).toHaveLength(2);
    expect(screen.getAllByText(/n\*\*\*@dominio\.com/).length).toBeGreaterThan(0);
  });
});

describe('SentNotifications', () => {
  it('lista los avisos con el tipo en castellano, el canal, el destinatario enmascarado y el estado', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Avisos enviados' })).toBeInTheDocument();
    // Cada tipo está en la tabla y en las opciones del filtro «Aviso».
    expect(screen.getAllByText('Pedido confirmado')).toHaveLength(2);
    expect(screen.getAllByText('El repartidor llegó')).toHaveLength(2);
    // Un tipo que el panel no conoce se muestra tal cual.
    expect(screen.getByText('CODIGO_NUEVO')).toBeInTheDocument();
    // La grilla de pruebas no tiene ancho: sólo dibuja las primeras columnas, el resto se ve en el detalle.
    expect(screen.getByText('¡Tu pedido llegó!')).toBeInTheDocument();
    expect(lastFilters()).toEqual({
      channel: undefined,
      status: undefined,
      type: undefined,
      from: undefined,
      to: undefined,
      term: undefined,
      limit: 10,
      offset: 0,
    });
  });

  it('los filtros salen de la URL, van al back y se ven como chips', () => {
    renderPage('/sent-notifications?channel=push&status=failed&type=CASH_READY&from=2026-11-01&q=abc&page=2');
    expect(list.filters[0]).toEqual({
      channel: 'push',
      status: 'failed',
      type: 'CASH_READY',
      from: '2026-11-01',
      to: undefined,
      term: 'abc',
      limit: 10,
      offset: 10,
    });
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('Notificación');
    expect(chips).toHaveTextContent('Falló');
    expect(chips).toHaveTextContent('Tené listo el efectivo');
    expect(chips).toHaveTextContent('"abc"');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('un valor de filtro que no existe se ignora', () => {
    renderPage('/sent-notifications?channel=sms&status=perdido');
    expect(lastFilters()).toMatchObject({ channel: undefined, status: undefined });
  });

  it('el detalle muestra el error de un aviso fallido y el enlace al pedido', () => {
    renderPage();
    // La primera coincidencia es la opción del filtro; la segunda, el renglón de la tabla.
    fireEvent.click(screen.getAllByText('El repartidor llegó')[1]);
    expect(screen.getByTestId('search')).toHaveTextContent('id=00000000-0000-4000-8000-000000000002');
    expect(screen.getByRole('alert')).toHaveTextContent('El aviso no se pudo enviar: token inválido');
    expect(screen.getByRole('link', { name: /abc123/i })).toHaveAttribute('href', `/orders/${ORDER}`);
    expect(screen.getByText('***abc123')).toBeInTheDocument();
    expect(screen.getByText('Falló', { selector: 'span' })).toBeInTheDocument();
  });

  it('un aviso que no salió lo explica distinto', () => {
    renderPage('/sent-notifications?id=00000000-0000-4000-8000-000000000003');
    expect(screen.getByRole('alert')).toHaveTextContent('El aviso no salió: sin configurar');
  });

  it('como administrador general sin distribuidora pide elegir una y no consulta', () => {
    perms.value = { needsDistributor: true };
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(list.enabled.every((enabled) => enabled === false)).toBe(true);
  });
});
