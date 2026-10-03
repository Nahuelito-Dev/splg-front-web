import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PackagePlus } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationsDrawer, type NotificationsDrawerItem } from './NotificationsDrawer';

const item = (id: string, read: boolean): NotificationsDrawerItem => ({
  id,
  title: `Nuevo pedido ${id}`,
  detail: '#ABC123 · $ 1.500',
  createdAt: new Date().toISOString(),
  read,
  icon: PackagePlus,
  tone: 'primary',
});

afterEach(cleanup);

describe('NotificationsDrawer', () => {
  it('las pestañas cuentan Todas y Sin leer, y Sin leer filtra', () => {
    render(
      <NotificationsDrawer
        open
        onClose={vi.fn()}
        notifications={[item('a', false), item('b', true), item('c', false)]}
        onNotificationClick={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /Sin leer/ })).toHaveTextContent('2');
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(3);

    fireEvent.click(screen.getByRole('tab', { name: /Sin leer/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('button')).toHaveLength(2);
    expect(within(panel).queryByText('Nuevo pedido b')).not.toBeInTheDocument();
  });

  it('el clic avisa cuál y «marcar todas» sólo aparece si hay acción', () => {
    const onClick = vi.fn();
    const onMarkAll = vi.fn();
    const { rerender } = render(
      <NotificationsDrawer
        open
        onClose={vi.fn()}
        notifications={[item('a', false)]}
        onNotificationClick={onClick}
        onMarkAllAsRead={onMarkAll}
      />,
    );
    fireEvent.click(screen.getByText('Nuevo pedido a'));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));
    expect(onMarkAll).toHaveBeenCalled();

    rerender(
      <NotificationsDrawer open onClose={vi.fn()} notifications={[item('a', true)]} onNotificationClick={onClick} />,
    );
    expect(screen.queryByRole('button', { name: 'Marcar todas como leídas' })).not.toBeInTheDocument();
  });

  it('sin avisos sin leer, la pestaña lo dice', () => {
    render(
      <NotificationsDrawer open onClose={vi.fn()} notifications={[item('a', true)]} onNotificationClick={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Sin leer/ }));
    expect(screen.getByText('Estás al día')).toBeInTheDocument();
  });
});
