import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok, pageOf } from '../../../test/pageTest';
import { supplier } from '../../../test/fixtures';

const state = vi.hoisted(() => ({ options: vi.fn() }));
vi.mock('../../../services/queries/purchases', () => ({
  useSupplierOptions: (...args: unknown[]) => state.options(...args) as unknown,
}));

import { SupplierField } from './SupplierField';

const Harness = ({ selectedId }: { selectedId: string }) => {
  const methods = useForm({ defaultValues: { supplierId: selectedId } });
  return (
    <FormProvider {...methods}>
      <SupplierField name="supplierId" />
    </FormProvider>
  );
};

const field = (selectedId = '') => <Harness selectedId={selectedId} />;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SupplierField', () => {
  it('con pocos proveedores no muestra buscador', () => {
    state.options.mockReturnValue(ok(pageOf([supplier()])));
    render(field());
    expect(screen.queryByLabelText('Buscar proveedor')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gas del Norte SA' })).toBeInTheDocument();
  });

  it('si hay más de los que se listan ofrece buscar y consulta al back con lo escrito', async () => {
    state.options.mockReturnValue(ok(pageOf([supplier()], 250)));
    render(field());
    expect(screen.getByText(/escribí arriba para buscar/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar proveedor'), { target: { value: 'norte' } });
    await waitFor(() => expect(state.options).toHaveBeenLastCalledWith(expect.objectContaining({ term: 'norte' })));
  });

  it('el proveedor elegido sigue como opción aunque la búsqueda ya no lo devuelva', () => {
    state.options.mockReturnValue(ok(pageOf([supplier()], 250)));
    const { rerender } = render(field('s-1'));
    state.options.mockReturnValue(ok(pageOf([supplier({ supplierId: 's-2', businessName: 'Otra SRL' })], 250)));
    rerender(field('s-1'));
    const select = screen.getByLabelText(/Proveedor/, { selector: 'select' });
    expect(within(select).getByRole('option', { name: 'Gas del Norte SA' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Otra SRL' })).toBeInTheDocument();
  });
});
