import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { chipText } from './chipText';
import { FilterChips } from './FilterChips';

afterEach(cleanup);

describe('chipText', () => {
  it.each([
    [{ key: 'status', label: 'Bloqueado' }, 'Estado: Bloqueado'],
    [{ key: 'q', label: '"juan"' }, 'Búsqueda: "juan"'],
    [{ key: 'payment', label: 'Cobro: Pagado' }, 'Cobro: Pagado'],
    [{ key: 'order', label: 'Pedido 1a2b' }, 'Pedido 1a2b'],
    [{ key: 'from', label: 'Desde 01/09/2026' }, 'Desde 01/09/2026'],
    [{ key: 'box', label: 'Central', name: 'Caja' }, 'Caja: Central'],
  ])('%j -> %s', (chip, text) => {
    expect(chipText(chip)).toBe(text);
  });
});

describe('FilterChips', () => {
  it('dibuja el nombre del filtro en cada chip', () => {
    render(<FilterChips items={[{ key: 'status', label: 'Bloqueado' }]} onRemove={() => undefined} />);
    expect(screen.getByText('Estado: Bloqueado')).toBeInTheDocument();
  });
});
