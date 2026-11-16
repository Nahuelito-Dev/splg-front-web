import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conversation } from '../../../test/chatFixtures';
import { mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ chats: undefined as unknown, chat: undefined as unknown }));

vi.mock('../../../services/queries/supportChat', () => ({
  usePlatformChats: () => state.chats,
  usePlatformChat: () => state.chat,
  usePlatformChatAction: () => mutation(),
  useQuickReplies: () => ok({ items: [] }),
}));
vi.mock('../../../services/queries/chatSources', () => ({
  usePlatformChatThread: () => ({ source: {}, read: vi.fn() }),
}));
vi.mock('../../../services/queries/supportSessions', () => ({ usePlatform: () => ok({ name: 'OrixTech' }) }));
vi.mock('../../../context/useSocketContext', () => ({ useSocketContext: () => ({ isOnline: true }) }));
vi.mock('../../../features/chat/components/ChatThread', () => ({ ChatThread: () => <p>hilo</p> }));
vi.mock('../../../features/chat/components/useChatTicketing', () => ({
  useChatTicketing: () => ({ selecting: false, start: vi.fn(), bar: null, selection: undefined, modals: null }),
}));

import { PlatformChatList } from './PlatformChatList';
import { PlatformChatPanel } from './PlatformChatPanel';

const since = new Date(Date.now() - 7 * 60_000).toISOString();
const waiting = conversation({ id: 'c-2', distributorName: 'Gas Sur', awaitingHumanSince: since });
const plain = conversation({ id: 'c-1', distributorName: 'Gas Norte' });
const listOf = (items: unknown[]) => ok({ items, total: items.length, counts: { waiting: items.length, mine: 0 } });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Chat con empresas: esperando a alguien del equipo', () => {
  it('la marca con desde cuándo; el orden es el de la API (el back pone primero los que esperan)', () => {
    state.chats = listOf([waiting, plain]);
    renderPage(<PlatformChatList tab="waiting" onTab={vi.fn()} selectedId={undefined} />, { url: '/platform/chats' });
    const rows = within(screen.getByRole('list', { name: 'Chats abiertos' })).getAllByRole('link');
    expect(within(rows[0]).getByText('Gas Sur')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Esperando a alguien del equipo')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/hace 7m/)).toHaveAttribute('datetime', since);
    expect(within(rows[1]).queryByText('Esperando a alguien del equipo')).not.toBeInTheDocument();
  });

  it('el chat abierto muestra la marca arriba; tomado (sin la fecha), no', () => {
    state.chat = ok(waiting);
    const view = renderPage(<PlatformChatPanel id="c-2" myUserId="u-me" />, { url: '/platform/chats/c-2' });
    expect(screen.getByText('Esperando a alguien del equipo')).toBeInTheDocument();
    view.unmount();
    state.chat = ok({ ...waiting, awaitingHumanSince: null, assignedTo: { userId: 'u-me', fullName: 'Ana' } });
    renderPage(<PlatformChatPanel id="c-2" myUserId="u-me" />, { url: '/platform/chats/c-2' });
    expect(screen.queryByText('Esperando a alguien del equipo')).not.toBeInTheDocument();
  });
});
