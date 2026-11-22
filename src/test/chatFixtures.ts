import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { SocketContextValue } from '../context/socketContextValue';
import type { Conversation, MessageDto, Ticket, TicketSummary } from '../services/api/types';

/** Un mensaje de texto de la API, con lo justo. */
export const msg = (seq: number, over: Partial<MessageDto> = {}): MessageDto => ({
  id: `m-${seq}`,
  conversationId: 'c-1',
  seq,
  clientMessageId: null,
  party: 'platform',
  sender: { displayName: 'Lucía' },
  isMine: false,
  kind: 'text',
  payload: null,
  citedInTickets: [],
  body: `mensaje ${seq}`,
  bodyFiltered: false,
  templateKey: null,
  systemCode: null,
  visibility: 'all',
  redacted: false,
  attachment: null,
  createdAt: new Date(Date.UTC(2026, 10, 14, 15, seq)).toISOString(),
  ...over,
});

export const ticketSummary = (over: Partial<TicketSummary> = {}): TicketSummary => ({
  id: 't-1',
  number: 'T-000001',
  subject: 'Factura duplicada',
  status: 'open',
  priority: 'normal',
  updatedAt: '2026-11-14T15:00:00.000Z',
  unreadCount: 0,
  lastMessage: null,
  ...over,
});

export const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  ...ticketSummary(),
  counterpartLastReadSeq: 0,
  lastReadSeq: 0,
  distributorId: 'd-1',
  distributorName: 'Gas Norte',
  distributorLogoUrl: null,
  category: 'billing',
  conversationId: 'c-t1',
  origin: null,
  openedBy: 'company',
  assignedTo: null,
  attendedBy: null,
  firstResponseDueAt: null,
  firstResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  satisfaction: null,
  supportSessions: [],
  createdAt: '2026-11-14T14:00:00.000Z',
  ...over,
});

export const conversation = (over: Partial<Conversation> = {}): Conversation => ({
  id: 'c-1',
  distributorId: 'd-1',
  distributorName: 'Gas Norte',
  channel: 'platform_chat',
  subjectType: 'general',
  counterpart: { party: 'platform', displayName: 'OrixTech', photoUrl: null },
  status: 'open',
  canWrite: true,
  lastMessage: null,
  unreadCount: 0,
  counterpartLastReadSeq: 0,
  closedReason: null,
  createdAt: '2026-11-14T14:00:00.000Z',
  updatedAt: '2026-11-14T14:00:00.000Z',
  ticketsFromHere: [],
  ...over,
});

type Handler = (payload: unknown) => void;

/** Un socket falso: guarda los manejadores para disparar eventos y registra lo que se emite. */
export const fakeSocket = (online = true) => {
  const handlers = new Map<string, Set<Handler>>();
  const value: SocketContextValue = {
    isOnline: online,
    subscribe: <T>(event: string, handler: (payload: T) => void) => {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(handler as Handler);
      handlers.set(event, set);
      return () => set.delete(handler as Handler);
    },
    emit: vi.fn(),
    request: vi.fn(() => Promise.resolve({ ok: true })) as SocketContextValue['request'],
  };
  const fire = (event: string, payload: unknown) => handlers.get(event)?.forEach((h) => h(payload));
  return { value, fire, handlers };
};

export const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
