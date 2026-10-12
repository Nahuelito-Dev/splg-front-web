import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useClampPage, useUrlPagedParams } from './useUrlParam';

const setup = (initial: string | { pathname: string; search?: string; state?: unknown } = '/') => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ q: '' }, 10);
      const location = useLocation();
      return {
        filters,
        setFilters,
        pagination,
        setPagination,
        search: location.search,
        state: location.state as unknown,
      };
    },
    { wrapper },
  );
};

describe('useUrlPagedParams', () => {
  it('sin parámetros arranca en la primera página', () => {
    expect(setup().result.current.pagination).toEqual({ page: 0, pageSize: 10 });
  });

  it('la página sale de la URL (base 1) y se escribe en ella', () => {
    const { result } = setup('/?page=3');
    expect(result.current.pagination.page).toBe(2);
    act(() => result.current.setPagination({ page: 4 }));
    expect(result.current.search).toBe('?page=5');
  });

  it('una página inválida cae en la primera', () => {
    expect(setup('/?page=abc').result.current.pagination.page).toBe(0);
  });

  it('cambiar un filtro vuelve a la primera página sin pisarse', () => {
    const { result } = setup('/?page=3&q=ana');
    act(() => result.current.setFilters({ q: 'luz' }));
    expect(result.current.search).toBe('?q=luz');
    expect(result.current.pagination.page).toBe(0);
  });

  it('con keepPage el filtro no mueve la página', () => {
    const { result } = setup('/?page=3');
    act(() => result.current.setFilters({ q: 'x' }, { keepPage: true }));
    expect(result.current.pagination.page).toBe(2);
  });

  it('el tamaño de página va en la URL; cambiarlo vuelve a la primera y uno inválido cae al default', () => {
    const { result } = setup('/?page=3');
    act(() => result.current.setPagination({ page: 2, pageSize: 25 }));
    expect(result.current.pagination).toEqual({ page: 0, pageSize: 25 });
    expect(result.current.search).toBe('?size=25');
    expect(setup('/?size=7').result.current.pagination.pageSize).toBe(10);
  });

  it('al escribir la URL conserva el state de navegación («vine de la lista»)', () => {
    const { result } = setup({ pathname: '/', state: { fromList: true } });
    act(() => result.current.setPagination({ page: 1 }));
    expect(result.current.state).toEqual({ fromList: true });
    act(() => result.current.setFilters({ q: 'x' }));
    expect(result.current.state).toEqual({ fromList: true });
  });
});

describe('useClampPage', () => {
  const clamp = (url: string, total: number) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    );
    return renderHook(
      () => {
        const [, , pagination, setPagination] = useUrlPagedParams({}, 10);
        useClampPage(pagination, total, setPagination);
        return { pagination, search: useLocation().search };
      },
      { wrapper },
    );
  };

  it('?page=999 vuelve a la última página que existe, también en la URL', () => {
    const { result } = clamp('/?page=999', 25);
    expect(result.current.pagination.page).toBe(2);
    expect(result.current.search).toBe('?page=3');
  });

  it('una página válida no se toca y sin filas queda en la primera', () => {
    expect(clamp('/?page=2', 25).result.current.pagination.page).toBe(1);
    expect(clamp('/?page=4', 0).result.current.pagination.page).toBe(0);
  });
});
