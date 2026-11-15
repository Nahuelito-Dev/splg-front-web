import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planDay, sheet, stop } from '../../test/routeSheetFixtures';

vi.mock('./StopOrderDrawer', () => ({
  StopOrderDrawer: ({ orderId }: { orderId: string | null }) =>
    orderId ? <aside aria-label="Pedido de la parada">{orderId}</aside> : null,
}));

import { DriverView } from './DriverView';

afterEach(cleanup);

describe('DriverView', () => {
  it('tocar una parada abre su pedido al costado', () => {
    const current = sheet({ stops: [stop(1), stop(2)] });
    render(<DriverView day={planDay({ sheets: [current] })} sheetId={current.id} onPick={vi.fn()} />);
    expect(screen.queryByRole('complementary', { name: 'Pedido de la parada' })).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Paradas en la app del chofer' });
    fireEvent.click(within(list).getByRole('button', { name: /Cliente 2/ }));
    expect(screen.getByRole('complementary', { name: 'Pedido de la parada' })).toHaveTextContent(stop(2).orderId);
  });

  it('cada parada dice cuántos envases retira (si retira)', () => {
    const current = sheet({ stops: [stop(1, { emptiesExpected: 3 }), stop(2)] });
    render(<DriverView day={planDay({ sheets: [current] })} sheetId={current.id} onPick={vi.fn()} />);
    const items = within(screen.getByRole('list', { name: 'Paradas en la app del chofer' })).getAllByRole('listitem');
    expect(within(items[0]).getByTestId('empties-tag')).toHaveTextContent('Retira 3 envases');
    expect(within(items[1]).queryByTestId('empties-tag')).not.toBeInTheDocument();
  });
});
