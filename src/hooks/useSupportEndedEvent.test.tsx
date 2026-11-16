import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const handlers = new Map<string, () => void>();
const sync = vi.fn();
vi.mock('../context/useSocketContext', () => ({
  useSocketContext: () => ({
    subscribe: (event: string, handler: () => void) => {
      handlers.set(event, handler);
      return () => handlers.delete(event);
    },
  }),
}));
vi.mock('../services/queries/supportSessions', () => ({ syncSupportMode: () => sync() as unknown }));

import { SUPPORT_ENDED_EVENT, useSupportEndedEvent } from './useSupportEndedEvent';

describe('useSupportEndedEvent', () => {
  it('con support:ended le pregunta a la API al instante', () => {
    const { unmount } = renderHook(() => useSupportEndedEvent(true));
    handlers.get(SUPPORT_ENDED_EVENT)?.();
    expect(sync).toHaveBeenCalledTimes(1);
    unmount();
    expect(handlers.has(SUPPORT_ENDED_EVENT)).toBe(false);
  });

  it('el admin de empresa no lo escucha', () => {
    renderHook(() => useSupportEndedEvent(false));
    expect(handlers.has(SUPPORT_ENDED_EVENT)).toBe(false);
  });
});
