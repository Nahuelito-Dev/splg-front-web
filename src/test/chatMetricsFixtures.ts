import type { AssistantMetrics, ChatMetrics, PlatformChatMetrics, ScoreCount } from '../services/api/types';

const scores = (counts: [number, number, number, number, number] = [0, 0, 0, 0, 0]): ScoreCount[] =>
  counts.map((count, i) => ({ score: i + 1, count }));

const emptyFirstResponse = {
  responded: 0,
  unanswered: 0,
  closedWithoutHumanReply: 0,
  medianMinutes: null,
  p90Minutes: null,
  target: { met: 0, missed: 0, rate: null },
};

const live = { open: 5, unassigned: 2, unanswered: 1, awaitingHuman: 1 };

export const assistantMetrics = (over: Partial<AssistantMetrics> = {}): AssistantMetrics => ({
  aiReplies: 4,
  handoffs: 4,
  handoffReasons: [
    { reason: 'requested', label: 'El cliente pidió hablar con una persona', count: 3 },
    { reason: 'low_confidence', label: 'El asistente no estaba seguro', count: 1 },
  ],
  conversationsAttended: 5,
  closedWithAssistant: 4,
  resolvedWithoutHuman: 1,
  resolvedWithoutHumanRate: 0.25,
  ...over,
});

/** El asistente sin actividad en el período. */
export const emptyAssistantMetrics = (): AssistantMetrics =>
  assistantMetrics({
    aiReplies: 0,
    handoffs: 0,
    handoffReasons: [],
    conversationsAttended: 0,
    closedWithAssistant: 0,
    resolvedWithoutHuman: 0,
    resolvedWithoutHumanRate: null,
  });

/** Un período con datos, como lo da `GET /v2/chat/metrics` (los dos canales). */
export const chatMetrics = (over: Partial<ChatMetrics> = {}): ChatMetrics => ({
  from: '2026-10-18',
  to: '2026-11-16',
  channel: null,
  targetMinutes: 30,
  conversations: 82,
  firstResponse: {
    responded: 40,
    unanswered: 3,
    closedWithoutHumanReply: 5,
    medianMinutes: 12,
    p90Minutes: 45,
    target: { met: 35, missed: 6, rate: 0.854 },
  },
  resolution: { closed: 60, medianMinutes: 95 },
  live,
  byChannel: [],
  byLabel: [],
  assistant: { ...assistantMetrics(), enabled: true },
  automaticReplies: {
    total: 23,
    byKey: [
      { key: 'fuera_de_horario', count: 15 },
      { key: 'recibido', count: 8 },
    ],
  },
  quickReplies: {
    total: 10,
    byKey: [
      { key: 'saludo', count: 4 },
      { key: 'demora', count: 6 },
    ],
  },
  satisfaction: {
    requested: 6,
    answered: 2,
    expired: 0,
    responseRate: 0.333,
    average: 4.5,
    csat: 1,
    byScore: scores([0, 0, 0, 1, 1]),
    assistant: { answered: 0, average: null, csat: null },
    team: { answered: 2, average: 4.5, csat: 1 },
  },
  daily: [
    { date: '2026-11-15', newConversations: 3, firstResponseMedianMinutes: 10 },
    { date: '2026-11-16', newConversations: 0, firstResponseMedianMinutes: null },
  ],
  ...over,
});

/** Un período sin nada: ceros y `null`, como responde la API. */
export const emptyChatMetrics = (over: Partial<ChatMetrics> = {}): ChatMetrics =>
  chatMetrics({
    conversations: 0,
    firstResponse: emptyFirstResponse,
    resolution: { closed: 0, medianMinutes: null },
    live: { open: 0, unassigned: 0, unanswered: 0, awaitingHuman: 0 },
    assistant: {
      ...emptyAssistantMetrics(),
      enabled: true,
    },
    automaticReplies: { total: 0, byKey: [] },
    quickReplies: { total: 0, byKey: [] },
    satisfaction: {
      requested: 0,
      answered: 0,
      expired: 0,
      responseRate: null,
      average: null,
      csat: null,
      byScore: scores(),
      assistant: { answered: 0, average: null, csat: null },
      team: { answered: 0, average: null, csat: null },
    },
    daily: [{ date: '2026-11-16', newConversations: 0, firstResponseMedianMinutes: null }],
    ...over,
  });

/** El tablero del soporte con datos (`GET /v2/platform/chat/metrics`). */
export const platformChatMetrics = (over: Partial<PlatformChatMetrics> = {}): PlatformChatMetrics => ({
  from: '2026-10-18',
  to: '2026-11-16',
  distributorId: null,
  chat: {
    chats: 12,
    waiting: 1,
    longestWaitMinutes: 35,
    medianWaitMinutes: 35,
    firstResponse: {
      ...emptyFirstResponse,
      responded: 10,
      unanswered: 1,
      medianMinutes: 3,
      p90Minutes: 20,
      target: null,
    },
    endedInTicket: 2,
    endedInTicketRate: 0.167,
  },
  tickets: {
    created: 5,
    open: 2,
    overdue: 1,
    firstResponse: {
      responded: 4,
      unanswered: 1,
      closedWithoutHumanReply: 0,
      medianMinutes: 30,
      p90Minutes: 120,
      target: { met: 3, missed: 1, rate: 0.75 },
    },
    resolution: { resolved: 3, medianMinutes: 240 },
    satisfaction: { rated: 2, responseRate: 0.667, average: 5, byScore: scores([0, 0, 0, 0, 2]) },
  },
  assistant: assistantMetrics(),
  companies: [
    { distributorId: 'd-1', name: 'Florchi Gas', conversations: 82, messages: 667, assistant: assistantMetrics() },
    { distributorId: 'd-2', name: 'Gas del Sur', conversations: 3, messages: 12, assistant: null },
  ],
  ...over,
});

/** El soporte sin actividad en el período. */
export const emptyPlatformChatMetrics = (): PlatformChatMetrics =>
  platformChatMetrics({
    chat: {
      chats: 0,
      waiting: 0,
      longestWaitMinutes: null,
      medianWaitMinutes: null,
      firstResponse: { ...emptyFirstResponse, target: null },
      endedInTicket: 0,
      endedInTicketRate: null,
    },
    tickets: {
      created: 0,
      open: 0,
      overdue: 0,
      firstResponse: emptyFirstResponse,
      resolution: { resolved: 0, medianMinutes: null },
      satisfaction: { rated: 0, responseRate: null, average: null, byScore: scores() },
    },
    assistant: emptyAssistantMetrics(),
    companies: [],
  });
