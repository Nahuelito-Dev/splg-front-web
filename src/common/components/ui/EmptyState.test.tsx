import { cleanup, render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { FilterChips } from './FilterChips';
import { ListSkeleton, ProfileSkeleton } from './Skeleton';

afterEach(cleanup);

describe('EmptyState', () => {
  it('por defecto dibuja la ilustración propia, decorativa y con el mensaje escrito', () => {
    const { container } = render(<EmptyState title="Sin reclamos" description="Todo en orden" illustration="done" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Sin reclamos')).toBeInTheDocument();
  });

  it('con `icon` usa el círculo con ícono y no la ilustración', () => {
    const { container } = render(<EmptyState title="Vacío" icon={Inbox} />);
    expect(container.querySelector('svg.h-24')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
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
