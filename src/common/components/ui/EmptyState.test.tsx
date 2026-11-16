import { cleanup, render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { FilterChips } from './FilterChips';
import { ListSkeleton, ProfileSkeleton } from './Skeleton';

afterEach(cleanup);

describe('EmptyState', () => {
  it('un solo estilo: ícono de 40 px en un círculo de 56, título de 16 y texto de 14', () => {
    const { container } = render(<EmptyState title="Sin reclamos" description="Todo en orden" illustration="done" />);
    const circle = container.querySelector('span[aria-hidden="true"]');
    expect(circle).toHaveClass('h-14', 'w-14', 'rounded-full');
    expect(circle?.querySelector('svg')).toHaveClass('h-10', 'w-10');
    expect(screen.getByText('Sin reclamos')).toHaveClass('text-base');
    expect(screen.getByText('Todo en orden')).toHaveClass('text-sm');
    // Ya no hay ilustración grande (120×96).
    expect(container.querySelector('svg.h-24')).toBeNull();
  });

  it('con `icon` usa ese ícono en el círculo', () => {
    const { container } = render(<EmptyState title="Vacío" icon={Inbox} />);
    expect(container.querySelector('svg.lucide-inbox')).not.toBeNull();
  });

  it('la acción es opcional', () => {
    render(<EmptyState title="Sin clientes" action={<button type="button">Nuevo cliente</button>} />);
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
  });

  it('compacto: sin ícono, en una caja de 64 px, para secciones y columnas de un tablero', () => {
    const { container } = render(<EmptyState compact title="Sin tareas" description="Nada pendiente" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.firstElementChild).toHaveClass('min-h-[64px]');
    expect(screen.getByText('Sin tareas')).toHaveClass('text-sm');
  });
});

describe('esqueletos por vista', () => {
  it('de listado y de ficha anuncian la carga a los lectores de pantalla', () => {
    render(
      <>
        <ListSkeleton />
        <ProfileSkeleton />
      </>,
    );
    expect(screen.getByRole('status', { name: 'Cargando listado' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cargando ficha' })).toBeInTheDocument();
  });
});

describe('FilterChips con resultados', () => {
  it('muestra "N resultados" junto a los chips y concuerda en singular', () => {
    const { rerender } = render(
      <FilterChips items={[{ key: 'q', label: '"ana"' }]} onRemove={() => undefined} resultCount={3} />,
    );
    expect(screen.getByText('resultados')).toBeInTheDocument();
    rerender(<FilterChips items={[{ key: 'q', label: '"ana"' }]} onRemove={() => undefined} resultCount={1} />);
    expect(screen.getByText('resultado')).toBeInTheDocument();
  });

  it('sin filtros no dibuja nada', () => {
    const { container } = render(<FilterChips items={[]} onRemove={() => undefined} resultCount={5} />);
    expect(container).toBeEmptyDOMElement();
  });
});
