import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useStoredFlag } from './useStoredFlag';

afterEach(() => localStorage.clear());

describe('useStoredFlag', () => {
  it('arranca con el valor inicial y lo recuerda entre montajes', () => {
    const first = renderHook(() => useStoredFlag('navMini'));
    expect(first.result.current[0]).toBe(false);
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    first.unmount();

    expect(renderHook(() => useStoredFlag('navMini')).result.current[0]).toBe(true);
  });

  it('un valor guardado en «0» gana sobre el inicial', () => {
    localStorage.setItem('navMini', '0');
    expect(renderHook(() => useStoredFlag('navMini', true)).result.current[0]).toBe(false);
  });
});
