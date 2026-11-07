import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarsTable } from './CarsTable';

// El DataGrid de MUI no maqueta en jsdom: alcanza con ver qué estado vacío recibe.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ empty }: { empty?: ReactNode }) => <div>{empty}</div>,
}));

afterEach(cleanup);

describe('CarsTable', () => {
  it('sin búsqueda y sin vehículos invita a agregar uno', () => {
    render(<CarsTable rows={[]} loading={false} onView={vi.fn()} />);
    expect(screen.getByText('No hay vehículos')).toBeTruthy();
  });

  it('con una patente buscada que no existe dice que no hay resultados', () => {
    render(<CarsTable rows={[]} loading={false} onView={vi.fn()} searching />);
    expect(screen.getByText('Sin resultados')).toBeTruthy();
    expect(screen.queryByText('No hay vehículos')).toBeNull();
  });

  it('si la búsqueda falló no dice que no hay resultados', () => {
    render(<CarsTable rows={[]} loading={false} onView={vi.fn()} searching searchFailed />);
    expect(screen.getByText('No se pudo buscar')).toBeTruthy();
    expect(screen.queryByText('Sin resultados')).toBeNull();
  });
});
