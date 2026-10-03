import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlParams } from './useUrlParam';

const DEFAULTS = { status: 'all', q: '', type: 'all' };

const setup = (initial = '/') => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const [values, setValues] = useUrlParams(DEFAULTS);
      return { values, setValues, search: useLocation().search };
    },
    { wrapper },
  );
};

describe('useUrlParams', () => {
  it('sin parámetros devuelve los valores por defecto', () => {
    expect(setup().result.current.values).toEqual(DEFAULTS);
  });

  it('lee los valores de la URL', () => {
    expect(setup('/?status=open&q=ana').result.current.values).toEqual({ status: 'open', q: 'ana', type: 'all' });
  });

  it('cambiar varios de golpe no se pisa, y el valor por defecto sale de la URL', () => {
    const { result } = setup('/?status=open&q=ana&type=damaged');
    act(() => result.current.setValues({ status: 'all', q: '', type: 'all' }));
    expect(result.current.search).toBe('');
    act(() => result.current.setValues({ status: 'resolved', q: 'luz' }));
    expect(result.current.search).toBe('?status=resolved&q=luz');
    expect(result.current.values).toEqual({ status: 'resolved', q: 'luz', type: 'all' });
  });

  it('respeta lo que no se toca', () => {
    const { result } = setup('/?type=damaged');
    act(() => result.current.setValues({ q: 'x' }));
    expect(result.current.values).toEqual({ status: 'all', q: 'x', type: 'damaged' });
  });
});
