import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { staffTypingStore, staffTypingText, useStaffTyping, type StaffTyping } from './staffTyping';

const at = (ms: number) => new Date(Date.now() + ms).toISOString();
const event = (userId: string, name: string, until: string, internal = false) => ({
  conversationId: 'c-1',
  userId,
  name,
  internal,
  until,
});
const person = (name: string, internal = false): StaffTyping => ({ userId: name, name, internal, until: 0 });

beforeEach(() => {
  vi.useFakeTimers();
  staffTypingStore.reset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('staffTypingText', () => {
  it('una, varias y notas internas', () => {
    expect(staffTypingText([])).toBeNull();
    expect(staffTypingText([person('Ana')])).toBe('Ana está respondiendo…');
    expect(staffTypingText([person('Ana', true)])).toBe('Ana escribe una nota interna…');
    expect(staffTypingText([person('Ana'), person('Beto', true)])).toBe('Ana y Beto están respondiendo…');
    expect(staffTypingText([person('Ana', true), person('Beto', true), person('Caro', true)])).toBe(
      'Ana, Beto y Caro escriben notas internas…',
    );
  });
});

describe('useStaffTyping', () => {
  it('cada persona se apaga sola en su `until`; un aviso nuevo de la misma la renueva', () => {
    const { result } = renderHook(() => useStaffTyping('c-1'));
    act(() => {
      staffTypingStore.set(event('u-ana', 'Ana', at(1000)));
      staffTypingStore.set(event('u-beto', 'Beto', at(3000)));
    });
    expect(result.current.map((t) => t.name)).toEqual(['Ana', 'Beto']);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.map((t) => t.name)).toEqual(['Beto']);
    act(() => staffTypingStore.set(event('u-beto', 'Beto', at(3000), true)));
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current).toEqual([expect.objectContaining({ name: 'Beto', internal: true })]);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toEqual([]);
  });

  it('un `until` inválido no se guarda; otra conversación no cuenta', () => {
    const { result } = renderHook(() => useStaffTyping('c-1'));
    act(() => {
      staffTypingStore.set(event('u-ana', 'Ana', 'mañana'));
      staffTypingStore.set({ ...event('u-beto', 'Beto', at(3000)), conversationId: 'c-2' });
    });
    expect(result.current).toEqual([]);
  });
});
