import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { card, sampleBoard } from './boardFixtures';

const socket = vi.hoisted(() => ({ handler: null as null | ((e: unknown) => void) }));
vi.mock('../../../context/useSocketContext', () => ({
  useSocketContext: () => ({
    subscribe: (_event: string, handler: (e: unknown) => void) => {
      socket.handler = handler;
      return () => undefined;
    },
  }),
}));

import { boardKey } from '../../../services/queries/fleet';
import { useFleetTaskBoardEvents } from './useFleetTaskBoardEvents';
import type { FleetTaskBoard } from '../../../services/api/types';

describe('useFleetTaskBoardEvents', () => {
  it('fleet:task actualiza la tarjeta en la caché sin recargar', () => {
    const client = new QueryClient();
    client.setQueryData(boardKey({}), sampleBoard());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    renderHook(() => useFleetTaskBoardEvents(true), { wrapper });
    const moved = card({
      id: 'f2',
      title: 'Seguro',
      status: 'in_progress',
      column: 'in_progress',
      position: 9999,
      updatedAt: '2026-11-12T00:00:00.000Z',
    });
    socket.handler?.({ id: 'f2', change: 'moved', card: moved });
    const board = client.getQueryData<FleetTaskBoard>(boardKey({}));
    expect(board?.columns.forecast.map((c) => c.id)).toEqual(['f1']);
    expect(board?.columns.in_progress.map((c) => c.id)).toEqual(['i1', 'f2']);
  });
});
