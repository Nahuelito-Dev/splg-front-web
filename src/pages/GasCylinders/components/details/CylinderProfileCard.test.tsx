import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCylinder } from '../../../../services/api/gasCylinders';

// La foto pide una URL renovable a la API: fuera del alcance de esta ficha.
vi.mock('../../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  EntityPhoto: () => null,
  PhotoThumb: () => null,
}));
vi.mock('../../../../hooks', () => ({ usePermissions: () => ({ canWrite: true, writeHint: undefined }) }));

import { CylinderProfileCard } from './CylinderProfileCard';

afterEach(cleanup);

const cylinder = {
  gas_cylinder_id: 'g1',
  type: '10kg',
  weight: 10,
  price: 9000,
  container_price: null,
  stock: 5,
  description: null,
  isActive: true,
  photoUrl: null,
  promotions: [],
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
} as unknown as CatalogCylinder;

describe('CylinderProfileCard: precio del envase (F35)', () => {
  it('sin precio cargado dice «Sin cargar»', () => {
    render(<CylinderProfileCard cylinder={cylinder} />);
    expect(screen.getByText('Precio del envase')).toBeInTheDocument();
    expect(screen.getByText('Sin cargar')).toBeInTheDocument();
  });

  it('con precio lo muestra como moneda', () => {
    render(<CylinderProfileCard cylinder={{ ...cylinder, container_price: 25000 }} />);
    expect(screen.getByText(/^\$\s25\.000$/)).toBeInTheDocument();
    expect(screen.queryByText('Sin cargar')).not.toBeInTheDocument();
  });
});
