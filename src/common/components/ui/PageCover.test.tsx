import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageCover } from './PageCover';

afterEach(cleanup);

describe('PageCover', () => {
  it('muestra identidad, etiquetas, acciones, KPIs y las pestañas al pie', () => {
    render(
      <PageCover
        avatar={<span>AP</span>}
        title="Ana Pérez"
        subtitle="ana@mail.com"
        badges={<span>Activo</span>}
        actions={<button type="button">Editar</button>}
        stats={[
          { label: 'Total comprado', value: '$ 12.000', hint: '4 pedidos' },
          { label: 'Pedidos', value: '4' },
          { label: 'Última compra', value: '01/10/2026' },
        ]}
      >
        <div role="tablist" aria-label="Secciones" />
      </PageCover>,
    );
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByText('Total comprado').closest('div')).toHaveTextContent('$ 12.000');
    expect(screen.getByText('4 pedidos')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('sin KPIs ni pestañas no dibuja franjas vacías', () => {
    render(<PageCover avatar={<span>X</span>} title="Sin datos" />);
    expect(screen.queryByRole('term')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
