import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../../../services/api/types';
import { formatNumber } from '../../../../utils/format';
import { CustomerSummary } from './CustomerSummary';

const catalog = vi.hoisted(() => ({
  state: { data: { rows: [{ gas_cylinder_id: 'g-10', type: '10kg' }], total: 1 }, isPending: false } as {
    data: { rows: { gas_cylinder_id: string; type: string }[]; total: number } | undefined;
    isPending: boolean;
  },
}));

vi.mock('../../../../services/queries/userAddresses', () => ({
  useDefaultUserAddress: () => ({ data: undefined, isPending: false, error: null }),
}));
vi.mock('../../../../services/queries/gasCylinders', () => ({
  useGasCylinderTypes: () => catalog.state,
}));

const customer = (parcial: Partial<Customer> = {}) =>
  ({
    customer_id: 'c-1',
    user_id: 'u-1',
    lat_lang: null,
    createdAt: '2026-06-01T10:00:00Z',
    deletedAt: null,
    avgMonthlyConsumptionKg: null,
    declaredCylinderTypeId: null,
    declaredCylinderType: null,
    nextRepurchaseEstimateAt: null,
    user: { email: 'ana@mail.com', phone_number: '3764111111', createdAt: '2026-06-01T10:00:00Z' },
    ...parcial,
  }) as unknown as Customer;

const valueOf = (label: string) => screen.getByText(label).nextSibling?.textContent;

afterEach(() => {
  cleanup();
  catalog.state = { data: { rows: [{ gas_cylinder_id: 'g-10', type: '10kg' }], total: 1 }, isPending: false };
});

describe('CustomerSummary · consumo declarado', () => {
  it('muestra el consumo formateado y la garrafa habitual del catálogo', () => {
    render(
      <CustomerSummary customer={customer({ avgMonthlyConsumptionKg: 1234.5, declaredCylinderTypeId: 'g-10' })} />,
    );

    expect(valueOf('Consumo declarado')).toBe(`${formatNumber(1234.5)} kg por mes`);
    expect(valueOf('Garrafa habitual')).toBe('10kg');
  });

  it('un consumo en cero es un dato, no "Sin declarar"', () => {
    render(<CustomerSummary customer={customer({ avgMonthlyConsumptionKg: 0 })} />);

    expect(valueOf('Consumo declarado')).toBe('0 kg por mes');
  });

  it('si el cliente no declaró, lo dice en vez de dejar el campo vacío', () => {
    render(<CustomerSummary customer={customer()} />);

    expect(valueOf('Consumo declarado')).toBe('Sin declarar');
    expect(valueOf('Garrafa habitual')).toBe('Sin declarar');
  });

  it('la garrafa habitual de otra distribuidora no se muestra', () => {
    render(
      <CustomerSummary customer={customer({ declaredCylinderTypeId: 'g-de-otra', declaredCylinderType: '45kg' })} />,
    );

    expect(valueOf('Garrafa habitual')).toBe('Sin declarar');
    expect(screen.queryByText('45kg')).toBeNull();
  });

  it('mientras carga el catálogo no afirma nada', () => {
    catalog.state = { data: undefined, isPending: true };
    render(<CustomerSummary customer={customer({ declaredCylinderTypeId: 'g-10' })} />);

    expect(valueOf('Garrafa habitual')).toBe('Cargando…');
  });

  it('no muestra la recompra estimada: sale de compras en cualquier distribuidora', () => {
    render(<CustomerSummary customer={customer({ nextRepurchaseEstimateAt: '2026-10-16T12:00:00Z' })} />);

    expect(screen.queryByText('Próxima recompra estimada')).toBeNull();
  });
});
