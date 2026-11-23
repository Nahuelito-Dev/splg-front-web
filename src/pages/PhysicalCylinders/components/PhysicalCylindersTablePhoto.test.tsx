import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { Cylinder } from '../../../services/api/types';
import { PhysicalCylindersTable } from './PhysicalCylindersTable';

afterEach(cleanup);

const OWN = 'https://fotos.test/envase.jpg';
const PRODUCT = 'https://fotos.test/producto.jpg';

const cylinder = (photoUrl: string | null, productPhoto: string | null, hasProduct = true) =>
  ({
    cylinder_id: 'c-1',
    serial: 'GAS-001',
    state: 'in_depot',
    deposit: 0,
    photoUrl,
    gas_cylinder_id: hasProduct ? 'g-1' : null,
    gas_cylinder: hasProduct ? { type: 'Garrafa 10 kg', weight: 10, photoUrl: productPhoto } : null,
    current_customer: null,
    lastMovementAt: null,
  }) as unknown as Cylinder;

const draw = (row: Cylinder) =>
  render(
    <MemoryRouter>
      <PhysicalCylindersTable
        rows={[row]}
        total={1}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={() => undefined}
        onView={() => undefined}
      />
    </MemoryRouter>,
  );

describe('PhysicalCylindersTable: foto del envase', () => {
  it('muestra la foto del envase si la tiene', () => {
    const { container } = draw(cylinder(OWN, PRODUCT));
    expect(container.querySelector(`img[src="${OWN}"]`)).not.toBeNull();
    expect(container.querySelector(`img[src="${PRODUCT}"]`)).toBeNull();
  });

  it('sin foto propia usa la del producto', () => {
    const { container } = draw(cylinder(null, PRODUCT));
    expect(container.querySelector(`img[src="${PRODUCT}"]`)).not.toBeNull();
  });

  it('sin ninguna de las dos queda el ícono', () => {
    const { container } = draw(cylinder(null, null));
    expect(container.querySelector('img')).toBeNull();
  });

  it('sin producto asignado ni foto queda el ícono', () => {
    const { container } = draw(cylinder(null, null, false));
    expect(container.querySelector('img')).toBeNull();
  });
});
