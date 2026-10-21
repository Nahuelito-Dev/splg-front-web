import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CardHeader } from './CardHeader';

afterEach(cleanup);

describe('CardHeader', () => {
  it('título como h2, subtítulo y acción', () => {
    render(<CardHeader title="Historial" subtitle="Cambios del pedido" action={<button>Ver todo</button>} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Historial' })).toBeInTheDocument();
    expect(screen.getByText('Cambios del pedido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todo' })).toBeInTheDocument();
  });

  it('se puede bajar a h3 cuando la tarjeta cuelga de otra sección', () => {
    render(<CardHeader title="Cliente" as="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Cliente' })).toBeInTheDocument();
  });
});
